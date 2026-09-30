import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, ChevronLeft, Heart, House, Search, User, X, MessageSquare, Send, UserCircle } from 'lucide-react';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { normalizeAppLanguage } from '@/src/lib/language';
import { resolveConfiguredApiUrl } from '@/src/lib/apiConfig';
import { type AboutLegalType } from '@/src/components/AboutLegalModal';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

interface Opinion {
  id: number;
  content: string;
  author_name: string;
  created_at: string;
}

interface OpinionsHubProps {
  onGoBack: () => void;
  onGoHome: () => void;
  onOpenReader: () => void;
  onOpenPlans: () => void;
  onOpenFavorites: () => void;
  onOpenUser: () => void;
  onOpenAboutLegal?: (type: AboutLegalType) => void;
}

export function OpinionsHub({ onGoBack, onGoHome, onOpenReader, onOpenPlans, onOpenFavorites, onOpenUser, onOpenAboutLegal }: OpinionsHubProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [newOpinion, setNewOpinion] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOpinions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(resolveConfiguredApiUrl('/api/opinions'));
      if (res.ok) {
        const data = await res.json();
        setOpinions(data);
      }
    } catch (e) {
      console.error('Fetch opinions error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchOpinions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpinion.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(resolveConfiguredApiUrl('/api/opinions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newOpinion, author: authorName }),
      });
      if (res.ok) {
        setNewOpinion('');
        void fetchOpinions();
      }
    } catch (e) {
      console.error('Submit opinion error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mobileNavItems = useMemo(() => ([
    { id: 'home', label: t('app.home'), icon: <House className="h-5 w-5" />, onClick: onGoHome },
    { id: 'reader', label: t('menu.books'), icon: <BookOpen className="h-5 w-5" />, onClick: onOpenReader },
    { id: 'search', label: t('menu.search'), icon: <Search className="h-5 w-5" />, onClick: () => undefined },
    { id: 'user', label: t('menu.user'), icon: <User className="h-5 w-5" />, onClick: onOpenUser },
    { id: 'plans', label: t('menu.plans'), icon: <Calendar className="h-5 w-5" />, onClick: onOpenPlans },
  ]), [currentLanguage, onGoHome, onOpenPlans, onOpenReader, onOpenUser]);

  return (
    <div className="flex h-full flex-col bg-[#111820] text-white">
      <header className="border-b border-white/10 bg-[#050b14]/96 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={onGoBack} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"><ChevronLeft className="h-5 w-5" /></button>
          <h2 className="text-xl font-bold font-serif">{currentLanguage === 'en' ? 'Opinions' : 'Opiniones'}</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pb-32">
        {/* Formulario */}
        <div className="max-w-2xl mx-auto rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl">
           <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="h-5 w-5 text-[#1b8be0]" />
              <h3 className="font-bold">{currentLanguage === 'en' ? 'Leave your opinion' : 'Deja tu opinión'}</h3>
           </div>
           <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder={currentLanguage === 'en' ? 'Your name (optional)' : 'Tu nombre (opcional)'}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-[#1b8be0] transition-all text-sm"
              />
              <textarea
                placeholder={currentLanguage === 'en' ? 'What do you think about the app or today\'s reading?' : '¿Qué piensas de la app o del pasaje de hoy?'}
                value={newOpinion}
                onChange={(e) => setNewOpinion(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-[#1b8be0] transition-all text-sm resize-none"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newOpinion.trim()}
                className="w-full py-3 rounded-full bg-[#1b8be0] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#2597eb] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? '...' : <><Send className="h-4 w-4" /> {currentLanguage === 'en' ? 'Post' : 'Publicar'}</>}
              </button>
           </form>
        </div>

        {/* Lista de Opiniones */}
        <div className="max-w-2xl mx-auto space-y-4">
           {isLoading ? (
             <div className="text-center py-10 opacity-30 uppercase tracking-widest text-[10px] font-bold animate-pulse">Cargando opiniones...</div>
           ) : opinions.length === 0 ? (
             <div className="text-center py-10 opacity-30 italic">No hay opiniones todavía. ¡Sé el primero!</div>
           ) : (
             opinions.map(o => (
               <div key={o.id} className="p-5 rounded-[26px] border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-3 mb-3">
                     <div className="h-8 w-8 rounded-full bg-[#1b8be0]/20 flex items-center justify-center text-[#1b8be0]"><UserCircle className="h-5 w-5" /></div>
                     <div>
                        <p className="text-sm font-bold">{o.author_name}</p>
                        <p className="text-[9px] opacity-40 uppercase tracking-tighter">{new Date(o.created_at).toLocaleDateString()}</p>
                     </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/80">{o.content}</p>
               </div>
             ))
           )}
        </div>

        <MobilePageFooter onOpenAboutLegal={onOpenAboutLegal} />
      </div>

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}
