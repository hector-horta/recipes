import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { Mail, Loader2, X } from 'lucide-react';

export function VerificationBanner() {
  const { t } = useTranslation();
  const { user, is_verified: isVerifiedUser } = useAuth();
  const { showToast } = useToast();

  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  const isAuthPage = currentPath === '/login' || currentPath === '/register' || currentPath === '/verify-email' || currentPath === '/reset-password' || currentPath === '/verify' || currentPath === '/reset-password';

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown > 0]);

  if (!user || isVerifiedUser || !isVisible || isAuthPage) return null;

  const handleResend = async () => {
    if (countdown > 0) return;

    setResending(true);
    try {
      await api.post('/auth/resend-verification');
      showToast(t('verificationBanner.sent'), 'success');
      setCountdown(process.env.NODE_ENV === 'test' ? 2 : 60);
    } catch (err: any) {
      showToast(err.response?.data?.message || t('auth.verify.resend_failed'), 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-brand-forest/95 backdrop-blur-md border-b border-white/10 py-3 px-4 sm:px-6 lg:px-8 relative overflow-hidden animate-in slide-in-from-top duration-500">
      {/* Decorative organic blob */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-mint/10 rounded-full blur-3xl -mr-16 -mt-16" />
      
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-mint/20 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-brand-mint" />
          </div>
          <div>
            <h4 className="text-white text-sm font-black uppercase tracking-wider leading-none mb-1">
              {t('verificationBanner.title')}
            </h4>
            <p className="text-white/60 text-xs font-medium max-w-md">
              {t('verificationBanner.desc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="rounded-full px-6 py-2 h-auto text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-mint/20 hover:shadow-brand-mint/40"
          >
            {resending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-2" />
            ) : null}
            {countdown > 0 
              ? `${countdown}s` 
              : t('verificationBanner.button')
            }
          </Button>

          <button 
            onClick={() => setIsVisible(false)}
            className="p-2 text-white/20 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
