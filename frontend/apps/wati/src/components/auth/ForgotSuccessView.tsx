import { Mail } from 'lucide-react';
import { Button } from '@wati/ui-kit';
import { useTranslation } from 'react-i18next';

interface ForgotSuccessViewProps {
  email: string;
  onBack: () => void;
}

export function ForgotSuccessView({ email, onBack }: ForgotSuccessViewProps) {
  const { t } = useTranslation();

  return (
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
        onClick={onBack}
      >
        {t('auth.forgot.back_to_login')}
      </Button>
    </div>
  );
}
