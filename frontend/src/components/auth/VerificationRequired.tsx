import React from 'react';
import { ShieldAlert, Mail, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../AuthContext';
import { Button } from '../ui/Button';

interface VerificationRequiredProps {
  onBack?: () => void;
}

export function VerificationRequired({ onBack }: VerificationRequiredProps) {
  const { t } = useTranslation();
  const { resendVerification } = useAuth();
  const [resending, setResending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleResend = async () => {
    try {
      setResending(true);
      await resendVerification();
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      // Error is handled by AuthContext but we could show local toast
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fade-in">
      <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center text-amber-600 mb-6 shadow-sm border border-amber-200/50">
        <ShieldAlert size={40} />
      </div>
      
      <h2 className="text-3xl font-black text-brand-forest mb-4 tracking-tight">
        {t('auth.verificationRequiredTitle')}
      </h2>
      
      <p className="text-brand-text-muted max-w-md mb-10 leading-relaxed font-medium">
        {t('auth.verificationRequiredDesc')}
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Button 
          variant="primary" 
          size="lg" 
          fullWidth
          className="shadow-xl shadow-brand-mint/20"
          onClick={() => window.open('https://mail.google.com', '_blank')}
          leftIcon={<Mail size={18} />}
        >
          {t('auth.openEmail')}
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={handleResend}
            loading={resending}
            disabled={sent}
            className={sent ? 'text-green-600 border-green-200 bg-green-50' : ''}
          >
            {sent ? t('auth.linkSent') : t('auth.resendLink')}
          </Button>

          {onBack && (
            <Button 
              variant="ghost" 
              size="md" 
              fullWidth
              onClick={onBack}
            >
              {t('common.back')}
            </Button>
          )}
        </div>
      </div>

      <p className="mt-12 text-sm text-brand-text-muted font-bold flex items-center gap-2 opacity-60">
        Wati <span className="text-brand-teal">&bull;</span> {t('auth.secureCooking')}
      </p>
    </div>
  );
}
