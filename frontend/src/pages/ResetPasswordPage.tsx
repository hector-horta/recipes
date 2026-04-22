import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../ToastContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      showToast(t('auth.reset.invalid_token'), 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast(t('auth.reset.mismatch'), 'error');
      return;
    }

    if (password.length < 8) {
      showToast('La contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      showToast('La contraseña debe tener al menos una mayúscula', 'error');
      return;
    }

    if (!/[0-9]/.test(password)) {
      showToast('La contraseña debe tener al menos un número', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setIsSuccess(true);
      showToast(t('auth.reset.success_toast'), 'success');
      // The user wants to redirect to login modal (or home where login modal can be opened)
      // We'll show a success state first
    } catch (err: any) {
      showToast(err.response?.data?.error || err.response?.data?.message || t('auth.reset.failed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-brand-forest flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 text-center">
          <h1 className="text-2xl font-black text-brand-forest mb-4">{t('auth.reset.invalid_link_title')}</h1>
          <p className="text-brand-forest/60 mb-8">{t('auth.reset.invalid_link_desc')}</p>
          <Button variant="primary" onClick={() => window.location.href = '/'}>
            {t('auth.reset.go_home')}
          </Button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-brand-forest flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-full bg-brand-mint/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-brand-mint" />
          </div>
          <h1 className="text-2xl font-black text-brand-forest mb-4">{t('auth.reset.success_title')}</h1>
          <p className="text-brand-forest/60 mb-8">{t('auth.reset.success_desc_login')}</p>
          <Button variant="primary" onClick={() => window.location.href = '/?login=true'}>
            {t('auth.reset.go_to_login')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-forest flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        {/* Organic background shapes */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-mint/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-full bg-brand-forest/5 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-brand-forest" />
          </div>

          <h1 className="text-3xl font-black text-brand-forest mb-2">
            {t('auth.reset.title')}
          </h1>
          <p className="text-brand-forest/60 mb-8 leading-relaxed">
            {t('auth.reset.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-brand-forest/40 ml-1">
                {t('auth.reset.new_password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-forest/5 border-none rounded-2xl py-4 px-6 text-brand-forest placeholder:text-brand-forest/20 focus:ring-2 focus:ring-brand-mint transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-forest/20 hover:text-brand-forest transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-[10px] text-brand-forest/50 font-medium px-2 pt-1">
                Debe contener al menos 8 caracteres, una mayúscula y un número.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-brand-forest/40 ml-1">
                {t('auth.reset.confirm_password')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-brand-forest/5 border-none rounded-2xl py-4 px-6 text-brand-forest placeholder:text-brand-forest/20 focus:ring-2 focus:ring-brand-mint transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full py-4 text-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {t('auth.reset.submit_button')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
