import { Capacitor } from '@capacitor/core';

// Nota: Para que esto funcione en Android, debes instalar el plugin:
// npm install @capacitor-firebase/analytics
// npx cap sync

export type AnalyticsEvent =
  | { name: 'app_open'; params?: { platform: string; version: string } }
  | { name: 'bible_read'; params: { book: string; chapter: number } }
  | { name: 'search_query'; params: { query: string } }
  | { name: 'share_content'; params: { type: 'apk' | 'verse' | 'image' } }
  | { name: 'game_start'; params: { level: number } }
  | { name: 'theme_change'; params: { mode: 'dark' | 'light' } };

export async function trackEvent(event: AnalyticsEvent) {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  // 1. Registro en Consola (para desarrollo)
  if (import.meta.env.DEV) {
    console.log(`[Analytics] Event: ${event.name}`, event.params);
  }

  // 2. Envío al Servidor Propio (Ligero y para todas las plataformas)
  try {
    // Usamos el API de beacon o fetch normal de forma asíncrona para no bloquear la UI
    void fetch('/api/stats/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        platform,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    // Fallo silencioso
  }

  // 3. Preparado para Firebase Native (Solo si es Android/iOS)
  if (isNative) {
    try {
      // Aquí el plugin de Capacitor Firebase entrará en acción automáticamente
      // en cuanto el usuario añada el archivo google-services.json
      const { FirebaseAnalytics } = await import('@capacitor-firebase/analytics');
      await FirebaseAnalytics.logEvent({
        name: event.name,
        params: event.params,
      });
    } catch (e) {
      // El plugin no está instalado o configurado todavía
    }
  }
}

export function initAnalytics() {
  const version = (window as any).__APP_VERSION__ || '1.0.4';
  void trackEvent({
    name: 'app_open',
    params: {
      platform: Capacitor.getPlatform(),
      version
    }
  });
}
