import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Calendar, ChevronLeft, Heart, House, Mail, Search, User, LogOut, PencilLine } from 'lucide-react';
import { BrandSeal } from '@/src/components/BrandSeal';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { type AboutLegalType } from '@/src/components/AboutLegalModal';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

interface UserAccessHubProps {
  onGoBack: () => void;
  onGoHome: () => void;
  onOpenReader: () => void;
  onOpenSearch: () => void;
  onOpenPlans: () => void;
  onOpenFavorites: () => void;
  onOpenAboutLegal?: (type: AboutLegalType) => void;
}

interface StoredSession {
  name: string;
  email: string;
  provider: 'email' | 'google';
}

const STORAGE_KEY = 'biblia_nj_user_session';

function readSession(): StoredSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredSession : null;
  } catch {
    return null;
  }
}

export function UserAccessHub({ onGoBack, onGoHome, onOpenReader, onOpenSearch, onOpenPlans, onOpenFavorites, onOpenAboutLegal }: UserAccessHubProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.resolvedLanguage || i18n.language).startsWith('en') ? 'en' : 'es';
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<StoredSession | null>(() => readSession());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const copy = currentLanguage === 'en'
    ? {
        title: 'User access',
        signIn: 'Sign in',
        createAccount: 'Create account',
        continueGoogle: 'Continue with Google',
        email: 'Email address',
        password: 'Password',
        name: 'Display name',
        submitLogin: 'Sign in',
        submitSignup: 'Create account',
        forgot: 'Forgot my password',
        providerEmail: 'Email access',
        providerGoogle: 'Google access',
        saveName: 'Save profile',
        logout: 'Sign out',
      }
    : {
        title: 'Usuario',
        signIn: 'Iniciar sesión',
        createAccount: 'Crear cuenta',
        continueGoogle: 'Continuar con Google',
        email: 'Correo electrónico',
        password: 'Contraseña',
        name: 'Nombre para mostrar',
        submitLogin: 'Iniciar sesión',
        submitSignup: 'Crear cuenta',
        forgot: 'Olvidé mi contraseña',
        providerEmail: 'Acceso por correo',
        providerGoogle: 'Acceso con Google',
        saveName: 'Guardar perfil',
        logout: 'Cerrar sesión',
      };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  const mobileNavItems = useMemo(() => ([
    { id: 'home', label: currentLanguage === 'en' ? 'Home' : 'Inicio', icon: <House className="h-5 w-5" />, onClick: onGoHome },
    { id: 'reader', label: currentLanguage === 'en' ? 'Bible' : 'Biblia', icon: <BookOpen className="h-5 w-5" />, onClick: onOpenReader },
    { id: 'search', label: t('menu.search'), icon: <Search className="h-5 w-5" />, onClick: onOpenSearch },
    { id: 'plans', label: t('menu.plans'), icon: <Calendar className="h-5 w-5" />, onClick: onOpenPlans },
    { id: 'favorites', label: t('menu.favorites'), icon: <Heart className="h-5 w-5" />, onClick: onOpenFavorites },
    { id: 'user', label: t('menu.user'), icon: <User className="h-5 w-5" />, onClick: () => undefined, active: true },
  ]), [copy.title, currentLanguage, onGoHome, onOpenFavorites, onOpenPlans, onOpenReader, onOpenSearch]);

  const submitAccess = () => {
    if (!email.trim() || !password.trim()) {
      setStatusMessage(currentLanguage === 'en' ? 'Complete email and password.' : 'Completa correo y contraseña.');
      return;
    }

    const displayName = mode === 'signup' && name.trim() ? name.trim() : email.split('@')[0];
    setSession({
      name: displayName,
      email: email.trim(),
      provider: 'email',
    });
    setStatusMessage(currentLanguage === 'en' ? 'Access ready on this device.' : 'Acceso listo en este dispositivo.');
  };

  const signInWithGoogle = () => {
    setSession({
      name: currentLanguage === 'en' ? 'Google user' : 'Usuario Google',
      email: 'google@local.app',
      provider: 'google',
    });
    setStatusMessage(currentLanguage === 'en' ? 'Google access simulated locally.' : 'Acceso con Google simulado de forma local.');
  };

  return (
    <div className="flex h-full flex-col bg-[#06090f] text-white">
      <header className="border-b border-white/10 bg-[#050b14]/96 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition-all hover:bg-white/[0.08]"
            aria-label={currentLanguage === 'en' ? 'Back' : 'Volver'}
            title={currentLanguage === 'en' ? 'Back' : 'Volver'}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition-all hover:bg-white/[0.08]"
            aria-label={currentLanguage === 'en' ? 'Home' : 'Inicio'}
            title={currentLanguage === 'en' ? 'Home' : 'Inicio'}
          >
            <House className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[1.35rem] font-bold text-white">{copy.title}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7fb8ff]">
              {currentLanguage === 'en' ? 'Access and profile' : 'Acceso y perfil'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-6">
        {!session ? (
          <div className="mx-auto max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[32px] border border-[#1d4f96] bg-[#07152b] p-4 shadow-[0_22px_50px_rgba(0,0,0,0.35)]">
                <BrandSeal className="h-full w-full" showWordmark={false} />
              </div>
              <h2 className="mt-6 text-[2rem] font-bold tracking-tight text-white">{copy.title}</h2>
              <p className="mt-2 text-sm text-[#8dc3ff]/70">{currentLanguage === 'en' ? 'Your personal space in the Word.' : 'Tu espacio personal en la Palabra.'}</p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-md">
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => setMode('login')} className={cn('rounded-[24px] py-3.5 text-sm font-bold transition-all', mode === 'login' ? 'bg-[#1b8be0] text-white shadow-lg' : 'text-white/50 hover:bg-white/5')}>
                  {copy.signIn}
                </button>
                <button type="button" onClick={() => setMode('signup')} className={cn('rounded-[24px] py-3.5 text-sm font-bold transition-all', mode === 'signup' ? 'bg-[#1b8be0] text-white shadow-lg' : 'text-white/50 hover:bg-white/5')}>
                  {copy.createAccount}
                </button>
              </div>
            </div>

            <button type="button" onClick={signInWithGoogle} className="mt-6 flex w-full items-center justify-center gap-3 rounded-[24px] border border-[#1c3c69] bg-[#08192f] px-4 py-4 text-sm font-bold text-white shadow-[0_15px_35px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-0.5 active:scale-95">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 p-1">
                <Mail className="h-3.5 w-3.5 text-[#f0c15c]" />
              </div>
              {copy.continueGoogle}
            </button>

            <div className="mt-6 space-y-4 rounded-[32px] border border-white/10 bg-[#0a121e]/80 p-6 shadow-xl backdrop-blur-xl">
              {mode === 'signup' && (
                <div>
                  <span className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-widest text-[#8dc3ff]/60">{copy.name}</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-[#1b8be0]/50 focus:bg-black/30 transition-all" placeholder="Juan Pérez" />
                </div>
              )}
              <div>
                <span className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-widest text-[#8dc3ff]/60">{copy.email}</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-[#1b8be0]/50 focus:bg-black/30 transition-all" placeholder="ejemplo@correo.com" />
              </div>
              <div>
                <span className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-widest text-[#8dc3ff]/60">{copy.password}</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-[#1b8be0]/50 focus:bg-black/30 transition-all" placeholder="••••••••" />
              </div>

              <button type="button" onClick={submitAccess} className="mt-4 w-full rounded-full bg-white px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#050b14] shadow-lg transition-all hover:bg-[#8dc3ff] active:scale-95">
                {mode === 'login' ? copy.submitLogin : copy.submitSignup}
              </button>

              <button type="button" className="w-full py-2 text-center text-xs font-medium text-[#8dc3ff]/50 hover:text-[#8dc3ff] transition-colors">
                {copy.forgot}
              </button>
            </div>

            {statusMessage && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl border border-[#1b8be0]/20 bg-[#1b8be0]/10 px-4 py-3 text-center text-xs font-bold text-[#8dc3ff]">
                {statusMessage}
              </motion.div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-6">
            {/* Perfil Card */}
            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,#0a1526_0%,#050b14_100%)] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.4)] relative overflow-hidden">
              <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#1b8be0]/10 blur-[60px]" />
              <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[#f0c15c]/10 blur-[60px]" />

              <div className="relative flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1b8be0_0%,#4fa8ff_50%,#f0c15c_100%)] p-1 shadow-xl">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#050b14] text-3xl font-black text-white">
                    {session.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <h3 className="mt-5 text-2xl font-bold text-white">{session.name}</h3>
                <p className="text-sm text-[#8dc3ff]/60">{session.email}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#1b8be0]/20 bg-[#1b8be0]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8dc3ff]">
                  {session.provider === 'google' ? copy.providerGoogle : copy.providerEmail}
                </div>
              </div>

              {/* Stats Mini Grid */}
              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#f0c15c] mb-1">Racha</p>
                  <p className="text-2xl font-black text-white flex items-center justify-center gap-1.5">
                    7 <span className="text-xs text-[#f0c15c]">días</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#1b8be0] mb-1">Puntos</p>
                  <p className="text-2xl font-black text-white">1,240</p>
                </div>
              </div>
            </div>

            {/* Settings Area */}
            <div className="rounded-[32px] border border-white/10 bg-[#0a121e]/60 p-6 backdrop-blur-xl">
               <div className="space-y-5">
                  <div>
                    <span className="mb-2 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-[#8dc3ff]/60">
                      <PencilLine className="h-3 w-3" /> {copy.name}
                    </span>
                    <input value={session.name} onChange={(event) => setSession({ ...session, name: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-[#1b8be0]/40 transition-all" />
                  </div>

                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={() => setStatusMessage(currentLanguage === 'en' ? 'Profile updated.' : 'Perfil actualizado.')} className="w-full rounded-full bg-[#1b8be0] py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                      {copy.saveName}
                    </button>
                    <button type="button" onClick={() => setSession(null)} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-3.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all">
                      <LogOut className="h-3.5 w-3.5" />
                      {copy.logout}
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}

        <MobilePageFooter className="mt-8" onOpenAboutLegal={onOpenAboutLegal} />
      </div>

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}