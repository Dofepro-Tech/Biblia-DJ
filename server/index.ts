import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import type { RequestHandler, Response } from 'express';
import { getBibleVersion, normalizeAppLanguage } from '../src/lib/language.ts';
import type { ChatMessage, StudyStep } from '../src/types.ts';
import {
  generateAiText,
  getAiErrorDetails,
  getAvailableAiModels,
  getCurrentAiModel,
  getCurrentAiProvider,
  isAiProviderConfigured,
  isClientModelOverrideAllowed,
} from './aiProvider.ts';
import { searchBible } from './bibleSearch.ts';
import { getRemoteDailyContent } from './dailyContentFeed.ts';

type ExplainType = 'explica' | 'contexto' | 'aplicacion';
type StudyMode = 'book' | 'theme';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distIndexPath = path.resolve(projectRoot, 'dist', 'index.html');

dotenv.config({ path: path.resolve(projectRoot, '.env.local') });
dotenv.config({ path: path.resolve(projectRoot, '.env') });

const app = express();
const serverStartedAt = new Date().toISOString();
const API_BIBLE_BASE_URL = 'https://rest.api.bible/v1';
const DEFAULT_ENGLISH_BIBLE_ID = 'de4e12af7f28f599-01';
const RVR1909_USX_BASE_URL = 'https://raw.githubusercontent.com/BibleAquifer/ReinaValera1909/main/spa/usx';
const RVR1909_BOOK_CODES = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];
const rvr1909BookCache = new Map<string, Promise<string>>();
const explicitAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  'http://localhost',
  'http://localhost:3000',
  'http://127.0.0.1',
  'http://127.0.0.1:3000',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  process.env.APP_URL || '',
  process.env.OPENROUTER_SITE_URL || '',
  ...explicitAllowedOrigins,
].filter(Boolean));

function isAllowedLanOrigin(origin: string) {
  return /^https?:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(origin);
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || isAllowedLanOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
}));
app.use(express.json({ limit: '1mb' }));

function sendError(response: Response, statusCode: number, message: string) {
  response.status(statusCode).json({ error: message });
}

function isExplainType(value: unknown): value is ExplainType {
  return value === 'explica' || value === 'contexto' || value === 'aplicacion';
}

function isStudyMode(value: unknown): value is StudyMode {
  return value === 'book' || value === 'theme';
}

function isChatMessageArray(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.every((message) => {
    return (
      typeof message === 'object' &&
      message !== null &&
      (message.role === 'user' || message.role === 'model') &&
      typeof message.content === 'string'
    );
  });
}

function isVerseReference(value: unknown): value is NonNullable<StudyStep['verseReference']> {
  const candidate = value as {
    bookAbrev?: unknown;
    chapter?: unknown;
    verseNumber?: unknown;
  };

  return (
    typeof value === 'object' &&
    value !== null &&
    typeof candidate.bookAbrev === 'string' &&
    typeof candidate.chapter === 'number' &&
    Number.isFinite(candidate.chapter) &&
    typeof candidate.verseNumber === 'number' &&
    Number.isFinite(candidate.verseNumber)
  );
}

function parseStudyStep(rawResponse: string | undefined): StudyStep {
  if (!rawResponse) {
    throw new Error('Empty study step response.');
  }

  const trimmedResponse = rawResponse.trim();
  const jsonCandidate = trimmedResponse.startsWith('```')
    ? trimmedResponse.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    : trimmedResponse;
  const firstBraceIndex = jsonCandidate.indexOf('{');
  const lastBraceIndex = jsonCandidate.lastIndexOf('}');
  const normalizedJson = firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex
    ? jsonCandidate.slice(firstBraceIndex, lastBraceIndex + 1)
    : jsonCandidate;

  const parsedResponse = JSON.parse(normalizedJson);
  const isValidStep =
    typeof parsedResponse === 'object' &&
    parsedResponse !== null &&
    typeof parsedResponse.title === 'string' &&
    typeof parsedResponse.content === 'string' &&
    typeof parsedResponse.prompt === 'string' &&
    (parsedResponse.verseReference === undefined || isVerseReference(parsedResponse.verseReference));

  if (!isValidStep) {
    throw new Error('Invalid study step response.');
  }

  return parsedResponse as StudyStep;
}

function getSystemInstruction(language: 'en' | 'es') {
  if (language === 'en') {
    return `You are a biblical scholar, theologian, and wise, empathetic spiritual guide.
The user will share a Bible verse or chapter.
Your goal is to provide deep insights, historical context, or practical application of the Word.
Be reverent, clear, and accessible for believers of all levels.
If asked to 'Explain', break down the meaning.
If asked for 'Context', explain who wrote it, to whom, and the cultural and historical situation.
If asked for 'Application', suggest how to live this verse today.
Return results using Markdown for an enjoyable reading experience.
Do not go on too long unless asked; keep your answers concise and easy to read.
ALWAYS respond in English.`;
  }

  return `Eres un erudito bíblico, teólogo y guía espiritual sabio y empático.
El usuario te compartirá un versículo o capítulo de la Biblia.
Tu objetivo es proveer percepciones profundas, contexto histórico o aplicación práctica de la Palabra.
Sé reverente, claro y accesible para creyentes de todos los niveles.
Si se te pide 'Explicar', desglosa el significado.
Si se te pide 'Contexto', explica quién lo escribió, a quién y la situación cultural e histórica.
Si se te pide 'Aplicación', sugiere cómo vivir este versículo hoy.
Retorna resultados usando Markdown para una lectura agradable.
No te extiendas demasiado a menos que se te pida; mantén tus respuestas concisas y fáciles de leer.
SIEMPRE responde en Español.`;
}

function getExplainPrompt(language: 'en' | 'es', book: string, chapter: number, verse: number, text: string, type: ExplainType) {
  if (language === 'en') {
    return `Analyze the following verse: ${book} ${chapter}:${verse} - "${text}".\nPlease give me a ${type === 'explica' ? 'deep and spiritual explanation' : type === 'contexto' ? 'historical and cultural context' : 'practical application for my daily life'} of this passage.`;
  }

  return `Analiza el siguiente versículo: ${book} ${chapter}:${verse} - "${text}".\nPor favor, dame un(a) ${type === 'explica' ? 'explicación profunda y espiritual' : type === 'contexto' ? 'contexto histórico y cultural' : 'aplicación práctica para mi vida diaria'} de este pasaje.`;
}

function getStudyPrompt(language: 'en' | 'es', type: StudyMode, target: string, previousSteps: StudyStep[]) {
  if (language === 'en') {
    return `You are creating a guided Bible study session.
${type === 'book' ? `The book of study is: ${target}` : `The theme of study is: ${target}`}

Previous steps of the study: ${JSON.stringify(previousSteps)}

Your task is to generate the NEXT logical step of the study.
Return a JSON object with the following structure:
{
  "title": "Brief title of the step",
  "content": "Deep, devotional, and theological explanation of the current concept (in Markdown)",
  "prompt": "A reflection question or action for the user",
  "verseReference": {
    "bookAbrev": "Book abbreviation (e.g., Gn, Ex, Mt)",
    "chapter": 1,
    "verseNumber": 1
  }
}

Ensure the Biblical reference is real and relevant to the theme or progress in the book.
Use an inspiring and transformative tone. Respond in English.`;
  }

  return `Estás creando una sesión de estudio bíblico guiado.
${type === 'book' ? `El libro objeto de estudio es: ${target}` : `El tema objeto de estudio es: ${target}`}

Pasos anteriores del estudio: ${JSON.stringify(previousSteps)}

Tu tarea es generar el SIGUIENTE paso lógico del estudio.
Retorna un objeto JSON con la siguiente estructura:
{
  "title": "Breve título del paso",
  "content": "Explicación profunda, devocional y teológica del concepto actual (en Markdown)",
  "prompt": "Una pregunta de reflexión o acción para el usuario",
  "verseReference": {
    "bookAbrev": "Abreviatura del libro (ej: Gn, Ex, Mt)",
    "chapter": 1,
    "verseNumber": 1
  }
}

Asegúrate de que la referencia bíblica sea real y relevante para el tema o el progreso en el libro.
Usa un tono inspirador y transformador. Responde en Español.`;
}

function getModelOverride(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

const handleExplain: RequestHandler = async (request, response) => {
  const language = normalizeAppLanguage(request.body?.lang);
  const { book, chapter, verse, text, type } = request.body ?? {};
  const modelOverride = getModelOverride(request.body?.modelOverride);

  if (
    typeof book !== 'string' ||
    typeof chapter !== 'number' ||
    !Number.isFinite(chapter) ||
    typeof verse !== 'number' ||
    !Number.isFinite(verse) ||
    typeof text !== 'string' ||
    !isExplainType(type)
  ) {
    return sendError(response, 400, language === 'en' ? 'Invalid explain request.' : 'Solicitud de explicación inválida.');
  }

  try {
    const textResponse = await generateAiText([
      { role: 'system', content: getSystemInstruction(language) },
      { role: 'user', content: getExplainPrompt(language, book, chapter, verse, text, type) },
    ], {
      temperature: 0.7,
      modelOverride,
    });

    return response.json({
      text: textResponse || (language === 'en' ? 'Could not generate a response.' : 'No se pudo generar una respuesta.'),
    });
  } catch (error) {
    console.error('Explain route error:', error);
    const errorDetails = getAiErrorDetails(
      error,
      language,
      language === 'en' ? 'Could not generate a response.' : 'No se pudo generar una respuesta.',
    );
    return sendError(response, errorDetails.statusCode, errorDetails.message);
  }
};

const handleChat: RequestHandler = async (request, response) => {
  const language = normalizeAppLanguage(request.body?.lang);
  const { book, chapter, verseText, history, message } = request.body ?? {};
  const modelOverride = getModelOverride(request.body?.modelOverride);

  if (
    typeof book !== 'string' ||
    typeof chapter !== 'number' ||
    !Number.isFinite(chapter) ||
    typeof verseText !== 'string' ||
    !isChatMessageArray(history) ||
    typeof message !== 'string'
  ) {
    return sendError(response, 400, language === 'en' ? 'Invalid chat request.' : 'Solicitud de chat inválida.');
  }

  try {
    const textResponse = await generateAiText([
      { role: 'system', content: getSystemInstruction(language) },
      {
        role: 'user',
        content: language === 'en'
          ? `We are talking about this verse: ${book} ${chapter} - "${verseText}"`
          : `Estamos hablando sobre este versículo: ${book} ${chapter} - "${verseText}"`,
      },
      {
        role: 'assistant',
        content: language === 'en'
          ? 'Understood. What would you like to know about this passage?'
          : 'Entendido. ¿Qué te gustaría saber sobre este pasaje?',
      },
      ...history.map((historyItem): { role: 'assistant' | 'user'; content: string } => ({
        role: historyItem.role === 'model' ? 'assistant' : 'user',
        content: historyItem.content,
      })),
      { role: 'user', content: message },
    ], {
      temperature: 0.7,
      modelOverride,
    });

    return response.json({
      text: textResponse || (language === 'en' ? 'No response.' : 'Sin respuesta.'),
    });
  } catch (error) {
    console.error('Chat route error:', error);
    const errorDetails = getAiErrorDetails(
      error,
      language,
      language === 'en' ? 'No response.' : 'Sin respuesta.',
    );
    return sendError(response, errorDetails.statusCode, errorDetails.message);
  }
};

const handleStudyStep: RequestHandler = async (request, response) => {
  const language = normalizeAppLanguage(request.body?.lang);
  const { type, target, previousSteps } = request.body ?? {};
  const modelOverride = getModelOverride(request.body?.modelOverride);

  if (!isStudyMode(type) || typeof target !== 'string' || !Array.isArray(previousSteps)) {
    return sendError(response, 400, language === 'en' ? 'Invalid study request.' : 'Solicitud de estudio inválida.');
  }

  try {
    const textResponse = await generateAiText([
      { role: 'system', content: getSystemInstruction(language) },
      { role: 'user', content: getStudyPrompt(language, type, target, previousSteps as StudyStep[]) },
    ], {
      expectJson: true,
      temperature: 0.7,
      modelOverride,
    });

    return response.json({
      step: parseStudyStep(textResponse),
    });
  } catch (error) {
    console.error('Study route error:', error);
    const errorDetails = getAiErrorDetails(
      error,
      language,
      language === 'en' ? 'Could not generate the study step.' : 'No se pudo generar el paso del estudio.',
    );
    return sendError(response, errorDetails.statusCode, errorDetails.message);
  }
};

const handleBibleSearch: RequestHandler = async (request, response) => {
  const requestedLanguage = typeof request.query.lang === 'string' ? request.query.lang : undefined;
  const language = normalizeAppLanguage(requestedLanguage);
  const query = typeof request.query.query === 'string' ? request.query.query : '';
  const requestedLimit = typeof request.query.limit === 'string' ? Number(request.query.limit) : NaN;
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 60;

  if (query.trim().length < 2) {
    return response.json({
      query: query.trim(),
      total: 0,
      results: [],
      truncated: false,
    });
  }

  try {
    const searchResponse = await searchBible(query, language, limit);
    return response.json(searchResponse);
  } catch (error) {
    console.error('Bible search route error:', error);
    return sendError(response, 500, language === 'en' ? 'Could not complete Bible search.' : 'No se pudo completar la búsqueda bíblica.');
  }
};

const handleBibleRead: RequestHandler = async (request, response) => {
  const book = typeof request.query.book === 'string' ? request.query.book.trim() : '';
  const chapter = typeof request.query.chapter === 'string' ? Number(request.query.chapter) : NaN;
  const language = normalizeAppLanguage(typeof request.query.lang === 'string' ? request.query.lang : undefined);

  if (!book || !Number.isInteger(chapter) || chapter < 1) {
    return sendError(response, 400, language === 'en' ? 'Invalid Bible reference.' : 'Referencia bíblica inválida.');
  }

  try {
    if (language === 'es') {
      return response.json(await fetchRvr1909Chapter(book, chapter));
    }

    const apiKey = process.env.BIBLE_API_KEY;
    const bibleId = process.env.BIBLE_API_EN_BIBLE_ID || DEFAULT_ENGLISH_BIBLE_ID;

    if (!apiKey || !bibleId) {
      return sendError(response, 503, 'Bible content is not configured.');
    }

    const chapterId = `${getApiBibleBookId(book)}.${chapter}`;
    const bibleResponse = await fetch(
      `${API_BIBLE_BASE_URL}/bibles/${encodeURIComponent(bibleId)}/chapters/${encodeURIComponent(chapterId)}?content-type=json&include-notes=false&include-titles=true`,
      { headers: { 'api-key': apiKey } },
    );
    if (!bibleResponse.ok) {
      throw new Error(`API.Bible returned ${bibleResponse.status}.`);
    }

    const apiResponse = await bibleResponse.json() as { data?: { bookId?: string; number?: string; reference?: string; content?: unknown } };
    const verses = extractApiBibleVerses(apiResponse.data?.content);
    if (verses.length === 0) {
      throw new Error('API.Bible returned a chapter without verses.');
    }

    return response.json({
      testament: '',
      name: apiResponse.data?.reference?.replace(/\s+\d+$/, '') || book,
      num_chapters: 0,
      chapter,
      vers: verses,
    });
  } catch (error) {
    console.error('Bible read route error:', error);
    return sendError(response, 502, language === 'en' ? 'Could not load this Bible chapter.' : 'No se pudo cargar este capítulo bíblico.');
  }
};

async function fetchRvr1909Chapter(bookName: string, chapter: number) {
  const bookCode = getApiBibleBookId(bookName);
  const bookIndex = RVR1909_BOOK_CODES.indexOf(bookCode);
  if (bookIndex < 0) {
    throw new Error(`RVR1909 does not recognize book ${bookName}.`);
  }

  const paddedBookNumber = String(bookIndex + 1).padStart(2, '0');
  const cacheKey = `${paddedBookNumber}${bookCode}`;
  if (!rvr1909BookCache.has(cacheKey)) {
    rvr1909BookCache.set(cacheKey, (async () => {
      const sourceResponse = await fetch(`${RVR1909_USX_BASE_URL}/${cacheKey}RV09.usx`);
      if (!sourceResponse.ok) {
        throw new Error(`RVR1909 source returned ${sourceResponse.status}.`);
      }
      return sourceResponse.text();
    })().catch((error) => {
      rvr1909BookCache.delete(cacheKey);
      throw error;
    }));
  }

  const usx = await rvr1909BookCache.get(cacheKey)!;
  const chapterStart = new RegExp(`<chapter\\s+number="${chapter}"[^>]*\\/?>`, 'i');
  const startMatch = chapterStart.exec(usx);
  if (!startMatch || startMatch.index === undefined) {
    throw new Error(`RVR1909 chapter ${chapter} was not found.`);
  }

  const chapterContent = usx.slice(startMatch.index + startMatch[0].length);
  const nextChapterIndex = chapterContent.search(/<chapter\s+number="\d+"[^>]*\/>/i);
  const chapterUsx = nextChapterIndex >= 0 ? chapterContent.slice(0, nextChapterIndex) : chapterContent;
  const verseMatches = Array.from(chapterUsx.matchAll(/<verse\s+number="(\d+)"[^>]*\/>/gi));
  const vers = verseMatches.map((match, index) => {
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = index + 1 < verseMatches.length ? verseMatches[index + 1].index ?? chapterUsx.length : chapterUsx.length;
    return {
      id: Number(match[1]),
      number: Number(match[1]),
      verse: decodeUsxText(chapterUsx.slice(contentStart, contentEnd)),
    };
  }).filter((verse) => verse.verse);

  if (vers.length === 0) {
    throw new Error(`RVR1909 chapter ${chapter} has no verses.`);
  }

  return { testament: '', name: bookName, num_chapters: 0, chapter, vers };
}

function decodeUsxText(value: string) {
  return value
    .replace(/<note[\s\S]*?<\/note>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function getApiBibleBookId(bookName: string) {
  const aliases: Record<string, string> = {
    GENESIS: 'GEN', EXODO: 'EXO', EXODUS: 'EXO', LEVITICO: 'LEV', LEVITICUS: 'LEV',
    NUMEROS: 'NUM', NUMBERS: 'NUM', DEUTERONOMIO: 'DEU', DEUTERONOMY: 'DEU', JOSUE: 'JOS', JOSHUA: 'JOS',
    JUECES: 'JDG', JUDGES: 'JDG', RUT: 'RUT', RUTH: 'RUT', SALMOS: 'PSA', PSALMS: 'PSA',
    PROVERBIOS: 'PRO', PROVERBS: 'PRO', MATEO: 'MAT', MATTHEW: 'MAT', MARCOS: 'MRK', MARK: 'MRK',
    LUCAS: 'LUK', LUKE: 'LUK', JUAN: 'JHN', JOHN: 'JHN', HECHOS: 'ACT', ACTS: 'ACT',
    ROMANOS: 'ROM', ROMANS: 'ROM', APOCALIPSIS: 'REV', REVELATION: 'REV',
  };
  const normalizedName = bookName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return aliases[normalizedName] || normalizedName.replace(/[^A-Z0-9]/g, '');
}

function extractApiBibleVerses(content: unknown) {
  const collected = new Map<number, string[]>();

  const visit = (node: unknown, verseNumber?: number) => {
    if (!node || typeof node !== 'object') {
      return;
    }

    const item = node as { text?: unknown; attrs?: { verseId?: unknown }; items?: unknown[] };
    const verseId = typeof item.attrs?.verseId === 'string' ? item.attrs.verseId : undefined;
    const resolvedVerseNumber = verseId ? Number(verseId.split('.').at(-1)) : verseNumber;

    if (typeof item.text === 'string' && Number.isInteger(resolvedVerseNumber)) {
      const parts = collected.get(resolvedVerseNumber) || [];
      parts.push(item.text);
      collected.set(resolvedVerseNumber, parts);
    }

    item.items?.forEach((child) => visit(child, resolvedVerseNumber));
  };

  if (Array.isArray(content)) {
    content.forEach((node) => visit(node));
  }

  return Array.from(collected.entries())
    .map(([number, parts]) => ({ id: number, number, verse: parts.join('').replace(/\s+/g, ' ').trim() }))
    .filter((verse) => verse.verse)
    .sort((left, right) => left.number - right.number);
}

const handleDailyContent: RequestHandler = async (request, response) => {
  const requestedLanguage = typeof request.query.lang === 'string' ? request.query.lang : undefined;
  const language = normalizeAppLanguage(requestedLanguage);

  try {
    const dailyContent = await getRemoteDailyContent(language);
    return response.json(dailyContent);
  } catch (error) {
    console.error('Daily content route error:', error);
    return sendError(response, 500, language === 'en' ? 'Could not load daily content.' : 'No se pudo cargar el contenido diario.');
  }
};

const handleAiRuntimeConfig: RequestHandler = (_request, response) => {
  const provider = getCurrentAiProvider();

  return response.json({
    provider,
    currentModel: getCurrentAiModel(),
    overrideAllowed: isClientModelOverrideAllowed(),
    availableModels: getAvailableAiModels(provider),
  });
};

const handleHealth: RequestHandler = (_request, response) => {
  const provider = getCurrentAiProvider();

  return response.json({
    status: 'ok',
    service: 'biblia-dj-api',
    timestamp: new Date().toISOString(),
    startedAt: serverStartedAt,
    deploymentMode: existsSync(distIndexPath) ? 'fullstack' : 'api-only',
    appUrl: process.env.APP_URL || null,
    ai: {
      provider,
      configured: isAiProviderConfigured(provider),
      currentModel: getCurrentAiModel(),
      overrideAllowed: isClientModelOverrideAllowed(),
    },
  });
};

function registerAiRoutes(routeBase: string) {
  app.post(`${routeBase}/explain`, handleExplain);
  app.post(`${routeBase}/chat`, handleChat);
  app.post(`${routeBase}/study-step`, handleStudyStep);
}

registerAiRoutes('/api/ai');
registerAiRoutes('/api/gemini');
app.get('/api/health', handleHealth);
app.get('/api/ai/runtime', handleAiRuntimeConfig);
app.get('/api/bible/read', handleBibleRead);
app.get('/api/bible/search', handleBibleSearch);
app.get('/api/daily-content', handleDailyContent);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const handleSaveOpinion: RequestHandler = async (request, response) => {
  const { content, author } = request.body;
  if (!content) return sendError(response, 400, 'Content is required');

  try {
    // Fallback in-memory/log storage
    console.log(`[OPINION] ${author || 'Anónimo'}: ${content}`);
    return response.json({ id: Date.now(), content, author_name: author || 'Anónimo', created_at: new Date().toISOString() });
  } catch (error) {
    console.error('Save opinion error:', error);
    return sendError(response, 500, 'Could not save opinion');
  }
};

const handleGetOpinions: RequestHandler = async (_request, response) => {
  try {
    return response.json([]);
  } catch (error) {
    console.error('Get opinions error:', error);
    return response.json([]);
  }
};

const handleStatsEvent: RequestHandler = async (request, response) => {
  return response.json({ status: 'ok' });
};

app.post('/api/opinions', handleSaveOpinion);
app.get('/api/opinions', handleGetOpinions);
app.post('/api/stats/event', handleStatsEvent);

if (existsSync(distIndexPath)) {
  const distPath = path.resolve(projectRoot, 'dist');

  app.use(express.static(distPath, {
    index: false,
    setHeaders(response, servedPath) {
      if (servedPath.includes(`${path.sep}assets${path.sep}`)) {
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      response.setHeader('Cache-Control', 'no-cache');
    },
  }));

  app.get(/^(?!\/api).*/, (request, response) => {
    if (path.extname(request.path)) {
      response.status(404).end();
      return;
    }

    response.setHeader('Cache-Control', 'no-cache');
    response.sendFile(distIndexPath);
  });
}

const port = Number(process.env.PORT) || 3001;

// Configuración de Supabase (Nueva v1.0.5)
if (supabaseUrl && supabaseKey) {
  console.log('[SUPABASE] Conexión detectada y lista para v1.0.5');
}

app.listen(port, () => {
  console.log(`Bible NJ API listening on http://localhost:${port}`);
});