import { useLoginForm, AuthView } from '../../hooks/useLoginForm';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@wati/ui-kit';
import { useTranslation } from 'react-i18next';
import { WatiLogo } from '../WatiLogo';
import { ForgotSuccessView } from './ForgotSuccessView';

interface LoginFormProps {
  initialView?: AuthView;
  onSuccess: (userData?: any, view?: AuthView) => void;
  layout?: 'modal' | 'page';
}

export function LoginForm({ initialView = 'login', onSuccess, layout = 'modal' }: LoginFormProps) {
  const { t } = useTranslation();
  const {
    view,
    setView,
    email,
    setEmail,
    password,
    setPassword,
    displayName,
    setDisplayName,
    showPassword,
    setShowPassword,
    acceptedTerms,
    setAcceptedTerms,
    error,
    setError,
    isSubmitting,
    isForgotSuccess,
    setIsForgotSuccess,
    handleSubmit
  } = useLoginForm({ initialView, onSuccess });

  const renderHeader = () => {
    if (layout !== 'modal') return null;
    let title = '';
    if (view === 'register') title = t('auth.createAccount');
    else if (view === 'login') title = t('auth.signIn');
    else title = t('auth.forgot.title');

    return (
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center mb-3">
          <WatiLogo size={180} variant="white" />
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">{title}</h2>
        <p className="text-white/70 text-xs mt-1 font-medium italic">
          {view === 'forgot-password' ? t('auth.forgot.desc') : t('auth.subtitle')}
        </p>
      </div>
    );
  };

  const renderTabs = () => {
    if (layout !== 'page' || view === 'forgot-password') return null;
    return (
      <div className="flex rounded-xl overflow-hidden mb-8 border border-white/10">
        <button
          type="button"
          onClick={() => { setView('login'); setError(''); }}
          className={`flex-1 py-3 text-sm font-semibold transition-all duration-300 ${
            view === 'login' ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Iniciar Sesión
        </button>
        <button
          type="button"
          onClick={() => { setView('register'); setError(''); }}
          className={`flex-1 py-3 text-sm font-semibold transition-all duration-300 ${
            view === 'register' ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Crear Cuenta
        </button>
      </div>
    );
  };

  const renderFooterToggles = () => {
    return (
      <div className="flex items-center justify-center gap-2 text-white/70 text-xs mt-6 font-medium">
        {view === 'forgot-password' ? (
          <Button variant="link" onClick={() => setView('login')} className="text-brand-mint font-extrabold underline hover:text-white transition-colors p-0 h-auto">
            {t('auth.forgot.back_to_login')}
          </Button>
        ) : (
          <>
            <span className="opacity-80">{view === 'register' ? t('auth.haveAccount') : t('auth.noAccount')}</span>
            <Button variant="link" onClick={() => { setView(view === 'register' ? 'login' : 'register'); setError(''); }} className="text-brand-mint font-extrabold underline hover:text-white transition-colors p-0 h-auto">
              {view === 'register' ? t('auth.signInLink') : t('auth.createAccountLink')}
            </Button>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderTabs()}
      {error && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      {isForgotSuccess ? (
        <ForgotSuccessView email={email} onBack={() => { setView('login'); setIsForgotSuccess(false); }} />
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4" data-bwignore="true" noValidate>
            <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" defaultValue={email} />
            
            {view === 'register' && (
              <Input
                variant="glass" type="text" name="name" id="reg-name" autoComplete="name"
                placeholder={t('auth.yourName', { defaultValue: 'Tu nombre' })}
                value={displayName} onChange={e => setDisplayName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
              />
            )}

            <Input
              variant="glass" type="text" inputMode="email" name="email" id="login-email" autoComplete="email"
              placeholder={t('auth.emailPlaceholder', { defaultValue: 'Correo electrónico' })}
              value={email} onChange={e => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            {view !== 'forgot-password' && (
              <div className="space-y-1">
                <Input
                  variant="glass" type={showPassword ? 'text' : 'password'} name="password" id="login-password"
                  autoComplete={view === 'register' ? 'new-password' : 'current-password'}
                  placeholder={t('auth.passwordPlaceholder', { defaultValue: 'Contraseña' })}
                  value={password} onChange={e => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightElement={
                    <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)} className="text-white/40 hover:text-white transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  }
                />
                {view === 'register' && (
                  <p className="text-[10px] text-white/50 font-medium px-2 text-left">
                    Debe contener al menos 8 caracteres, una mayúscula y un número.
                  </p>
                )}
              </div>
            )}

            {view === 'register' && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox" id="acceptedTermsField" checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-brand-mint/50 bg-white/5 text-brand-mint focus:ring-brand-mint/50"
                />
                <label htmlFor="acceptedTermsField" className="text-xs text-white/70 font-medium leading-tight">
                  {t('auth.acceptTerms', { defaultValue: 'Acepto la Política de Privacidad y Términos, incluyendo el tratamiento de mis datos de salud (GDPR).' })}
                </label>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting} className="relative">
              {view === 'register' ? t('auth.startJourney') : view === 'login' ? (
                <div className="relative w-full flex items-center justify-center">
                  <span>{t('auth.enter')}</span>
                  {!isSubmitting && <ArrowRight className="absolute right-0 w-4 h-4 opacity-70" />}
                </div>
              ) : t('auth.forgot.submit_button')}
            </Button>

            {view === 'login' && (
              <div className="flex justify-center mt-2">
                <Button type="button" variant="link" onClick={() => setView('forgot-password')} className="text-xs font-extrabold text-brand-mint hover:text-white underline transition-colors p-0 h-auto">
                  {t('auth.forgotPassword')}
                </Button>
              </div>
            )}
          </form>

          {renderFooterToggles()}
        </>
      )}
    </>
  );
}
