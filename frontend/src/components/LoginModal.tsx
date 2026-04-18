import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../lib/api';
import { X, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { WatiLogo } from './WatiLogo';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (userData?: any) => void;
}

export type AuthView = 'login' | 'register' | 'forgot-password';

export function LoginModal({ onClose, onLoginSuccess }: LoginModalProps) {
  const { t } = useTranslation();
  const { login, register } = useAuth();

  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotSuccess, setIsForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    try {
      if (!email.trim() || !emailRegex.test(email.trim())) {
        setError('Email: Ingresa un correo electrónico válido.');
        setIsSubmitting(false);
        return;
      }

      if (view === 'forgot-password') {
        await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
        setIsForgotSuccess(true);
        setIsSubmitting(false);
        return;
      }

      let userData = null;
      if (view === 'register') {
        if (!displayName.trim()) { setError('Nombre: Ingresa tu nombre completo.'); setIsSubmitting(false); return; }
        if (password.length < 6) { setError('Contraseña: Debe tener al menos 6 caracteres.'); setIsSubmitting(false); return; }
        if (!acceptedTerms) { setError('Legal: Debes aceptar los Términos y Condiciones.'); setIsSubmitting(false); return; }
        userData = await register({ 
          email: email.trim().toLowerCase(), 
          password, 
          displayName: displayName.trim(), 
          acceptedTerms,
          language: 'es' 
        });
      } else {
        userData = await login({ 
          email: email.trim().toLowerCase(), 
          password 
        });
      }
      
      setTimeout(() => {
        onLoginSuccess(userData);
      }, 150);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('auth.unexpectedError'));
    } finally {
      if (view !== 'forgot-password' || !isForgotSuccess) {
        setIsSubmitting(false);
      }
    }
  };

  const renderHeader = () => {
    let title = '';
    if (view === 'register') title = t('auth.createAccount');
    else if (view === 'login') title = t('auth.signIn');
    else title = t('auth.forgot.title');

    return (
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center mb-3">
          <WatiLogo size={180} variant="white" />
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">
          {title}
        </h2>
        <p className="text-white/70 text-xs mt-1 font-medium italic">
          {view === 'forgot-password' ? t('auth.forgot.desc') : t('auth.subtitle')}
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-brand-forest/85 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md rounded-3xl p-7 border border-white/5 shadow-2xl animate-in glass-organic"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Header */}
        {renderHeader()}

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Success for Forgot Password */}
        {isForgotSuccess ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-brand-mint/20 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-brand-mint" />
            </div>
            <h3 className="text-white font-bold mb-2">{t('auth.forgot.success_title')}</h3>
            <p className="text-white/60 text-xs mb-6">
              {t('auth.forgot.success_desc', { email })}
            </p>
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setView('login');
                setIsForgotSuccess(false);
              }}
            >
              {t('auth.forgot.back_to_login')}
            </Button>
          </div>
        ) : (
          <>
            {/* Form */}
            <form 
              onSubmit={handleSubmit} 
              className="space-y-4"
              data-bwignore="true"
              noValidate
            >
              {/* Hidden username field for password manager compatibility */}
              <input 
                type="text" 
                name="username" 
                autoComplete="username" 
                className="hidden" 
                tabIndex={-1} 
                aria-hidden="true" 
                defaultValue={email}
              />
              
              {view === 'register' && (
                  <Input
                    variant="glass"
                    type="text"
                    name="name"
                    id="reg-name"
                    autoComplete="name"
                    placeholder={t('auth.yourName')}
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    leftIcon={<User className="w-4 h-4" />}
                  />
              )}

              <Input
                variant="glass"
                type="text"
                inputMode="email"
                name="email"
                id="login-email"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
              />

              {view !== 'forgot-password' && (
                <Input
                  variant="glass"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="login-password"
                  autoComplete={view === 'register' ? 'new-password' : 'current-password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightElement={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  }
                />
              )}


              {view === 'register' && (
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptedTermsModal"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-brand-mint/50 bg-white/5 text-brand-mint focus:ring-brand-mint/50"
                  />
                  <label htmlFor="acceptedTermsModal" className="text-xs text-white/70 font-medium">
                    {t('auth.acceptTerms')}
                  </label>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                rightIcon={!isSubmitting && <ArrowRight className="w-4 h-4" />}
              >
                {view === 'register' 
                  ? t('auth.startJourney') 
                  : view === 'login' 
                    ? t('auth.enter') 
                    : t('auth.forgot.submit_button')}
              </Button>

              {view === 'login' && (
                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => setView('forgot-password')}
                    className="text-xs font-extrabold text-brand-mint hover:text-white underline transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              )}
            </form>

            {/* Toggle */}
            <div className="text-center text-white/70 text-xs mt-5 font-medium">
              {view === 'forgot-password' ? (
                <Button
                  variant="link"
                  onClick={() => setView('login')}
                  className="text-brand-mint font-extrabold underline hover:text-white transition-colors"
                >
                  {t('auth.forgot.back_to_login')}
                </Button>
              ) : (
                <>
                  {view === 'register' ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
                  <Button
                    variant="link"
                    onClick={() => setView(view === 'register' ? 'login' : 'register')}
                    className="text-brand-mint font-extrabold underline hover:text-white transition-colors"
                  >
                    {view === 'register' ? t('auth.signInLink') : t('auth.createAccountLink')}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
