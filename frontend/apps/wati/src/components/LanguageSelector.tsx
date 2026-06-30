import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'es', flag: '🇲🇽', label: 'ES' }
];

const isWindows = /Windows/i.test(navigator.userAgent);

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const { user, updateUserProfile } = useAuth();

  const currentLang = i18n.language?.startsWith('es') ? 'es' : 'en';

  const handleChange = async (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('wati_language', code);
    if (user) {
      try {
        await updateUserProfile({ language: code } as any);
      } catch (err) {
        console.error('[LanguageSelector] Failed to save language preference:', err);
      }
    }
  };

  return (
    <div className="flex items-center gap-1 bg-brand-sage/10 border border-brand-sage/20 rounded-xl p-1">
      <Globe className="w-3.5 h-3.5 text-brand-forest/60 ml-2" />
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          type="button"
          onClick={() => handleChange(lang.code)}
          className={`
            px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all
            ${currentLang === lang.code
              ? 'bg-brand-forest text-white shadow-sm'
              : 'text-brand-forest/50 hover:text-brand-forest border border-transparent'}
          `}
        >
          {isWindows ? lang.label : lang.flag}
        </button>
      ))}
    </div>
  );
}
