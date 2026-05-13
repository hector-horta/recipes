import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorHeader, setErrorHeader] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setErrorHeader(t('auth.verify.error_title'));
      setErrorMessage(t('auth.verify.invalid_link'));
      return;
    }

    async function verify() {
      try {
        await api.post('/auth/verify', { token });
        setStatus('success');
        showToast(t('auth.verify.success_toast'), 'success');
        await refreshUser();
        // Redirect home after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setErrorHeader(t('auth.verify.error_title'));
        setErrorMessage(err.response?.data?.message || t('auth.verify.failed'));
      }
    }

    verify();
  }, [t, refreshUser, showToast]);

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification');
      showToast(t('auth.verify.resend_success'), 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || t('auth.verify.resend_failed'), 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-forest flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        {/* Organic background shapes */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-mint/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-forest/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-brand-forest/5 flex items-center justify-center mb-6">
            <Mail className="w-10 h-10 text-brand-forest" />
          </div>

          {status === 'loading' && (
            <>
              <h1 className="text-2xl font-black text-brand-forest mb-4">
                {t('auth.verify.verifying_title')}
              </h1>
              <p className="text-brand-forest/60 mb-8 leading-relaxed">
                {t('auth.verify.verifying_desc')}
              </p>
              <Loader2 className="w-8 h-8 text-brand-mint animate-spin" />
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-brand-mint/20 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                <CheckCircle2 className="w-10 h-10 text-brand-mint" />
              </div>
              <h1 className="text-2xl font-black text-brand-forest mb-4">
                {t('auth.verify.success_title')}
              </h1>
              <p className="text-brand-forest/60 mb-8 leading-relaxed">
                {t('auth.verify.success_desc')}
              </p>
              <Button 
                variant="primary" 
                onClick={() => window.location.href = '/'}
              >
                {t('auth.verify.go_home')}
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-black text-brand-forest mb-4">
                {errorHeader}
              </h1>
              <p className="text-brand-forest/60 mb-8 leading-relaxed">
                {errorMessage}
              </p>
              
              <div className="flex flex-col gap-3 w-full">
                <Button 
                  variant="primary" 
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t('auth.verify.resend_button')}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => window.location.href = '/'}
                >
                  {t('auth.verify.go_home')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
