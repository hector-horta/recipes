
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../AuthContext';
import { WatiLogo } from '../WatiLogo';
import { LanguageSelector } from '../LanguageSelector';
import { Button } from '../ui/Button';
import { FlaskConical, Radio, Settings, UserCircle, LogOut } from 'lucide-react';

interface TopNavProps {
  onOpenLogin: () => void;
  onOpenOnboarding: () => void;
}

export function TopNav({ onOpenLogin, onOpenOnboarding }: TopNavProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const API_MODE = import.meta.env.VITE_API_MODE || 'MOCK';

  return (
    <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-brand-sage/10 shadow-sm/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <WatiLogo size={32} />
          <div className="flex flex-col">
            <span className="text-xl font-extrabold text-brand-forest tracking-tight">Wati</span>
            <div className={`flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-current uppercase tracking-widest ${API_MODE === 'MOCK' ? 'text-brand-sage border-brand-sage/30 bg-brand-sage/5' : 'text-brand-celeste border-brand-celeste/30 bg-brand-celeste/5'}`}>
              {API_MODE === 'MOCK' ? <FlaskConical size={8} /> : <Radio size={8} />}
              {API_MODE === 'MOCK' ? t('nav.dev') : t('nav.live')}
            </div>
          </div>
        </div>

        {/* Language Selector + Auth Actions */}
        <div className="flex items-center gap-2">
          <LanguageSelector />
          {!user ? (
            <Button
              onClick={onOpenLogin}
              variant="primary"
              size="sm"
              className="px-5 py-2"
            >
              {t('nav.login')}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenOnboarding}
                leftIcon={<Settings className="w-3.5 h-3.5" />}
                className="bg-brand-sage/10 hover:bg-brand-sage/20 border border-brand-sage/20"
              >
                {t('nav.allergies')}
              </Button>
              <div className="flex items-center gap-3 pl-3 border-l border-brand-sage/20">
                <div className="w-9 h-9 rounded-full bg-brand-mint/20 flex items-center justify-center border border-brand-mint/30">
                  <UserCircle className="w-6 h-6 text-brand-forest" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-extrabold text-brand-forest leading-tight">{user.displayName}</p>
                  <button onClick={logout} className="flex items-center gap-1 text-[10px] font-bold text-brand-text-muted hover:text-danger transition-colors">
                    <LogOut size={10} />
                    {t('nav.logout')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
