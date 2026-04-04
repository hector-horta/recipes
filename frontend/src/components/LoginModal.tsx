import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { X, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { WatiLogo } from './WatiLogo';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (userData?: any) => void;
}

export function LoginModal({ onClose, onLoginSuccess }: LoginModalProps) {
  const { t } = useTranslation();
  const { login, register } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      let userData = null;
      if (isRegister) {
        if (!displayName.trim()) { setError(t('auth.nameRequired')); setIsSubmitting(false); return; }
        if (password.length < 6) { setError(t('auth.minChars')); setIsSubmitting(false); return; }
        if (!acceptedTerms) { setError(t('auth.termsRequired')); setIsSubmitting(false); return; }
        userData = await register(email.trim().toLowerCase(), password, displayName.trim(), acceptedTerms);
      } else {
        userData = await login(email.trim().toLowerCase(), password);
      }
      
      setTimeout(() => {
        onLoginSuccess(userData);
      }, 50);
    } catch (err: any) {
      setError(err.message || t('auth.unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <WatiLogo size={48} />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {isRegister ? t('auth.createAccount') : t('auth.signIn')}
          </h2>
          <p className="text-white/70 text-xs mt-1 font-medium italic">{t('auth.subtitle')}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-brand-mint transition-colors" />
              <input
                type="text"
                name="name"
                id="reg-name"
                autoComplete="name"
                placeholder={t('auth.yourName')}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mint/50 focus:border-brand-mint/50 transition-all"
              />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-brand-mint transition-colors" />
            <input
              type="email"
              name="email"
              id="login-email"
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mint/50 focus:border-brand-mint/50 transition-all"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-brand-mint transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              id="login-password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mint/50 focus:border-brand-mint/50 transition-all"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>

          {isRegister && (
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="acceptedTermsModal"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-brand-mint/50 bg-white/5 text-brand-mint focus:ring-brand-mint/50"
              />
              <label htmlFor="acceptedTermsModal" className="text-xs text-white/70">
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
            {isRegister ? t('auth.startJourney') : t('auth.enter')}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center text-white/70 text-xs mt-5 font-medium">
          {isRegister ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
          <Button
            variant="link"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-brand-mint font-extrabold underline hover:text-white transition-colors"
          >
            {isRegister ? t('auth.signInLink') : t('auth.createAccountLink')}
          </Button>
        </p>
      </div>
    </div>
  );
}
