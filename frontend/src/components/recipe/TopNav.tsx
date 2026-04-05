
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../AuthContext';
import { WatiLogo } from '../WatiLogo';
import { LanguageSelector } from '../LanguageSelector';
import { Button } from '../ui/Button';
import { Settings, UserCircle, LogOut } from 'lucide-react';

interface TopNavProps {
  onOpenLogin: () => void;
  onOpenOnboarding: () => void;
}

export function TopNav({ onOpenLogin, onOpenOnboarding }: TopNavProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-brand-sage/10 shadow-sm/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <WatiLogo size={32} />
          <span className="text-xl font-extrabold text-brand-forest tracking-tight">Wati</span>
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
                  <Button
                  variant="link"
                  onClick={logout}
                  className="flex items-center gap-1 text-[10px] font-bold text-brand-text-muted hover:text-danger transition-colors p-0 h-auto"
                >
                  <LogOut size={10} />
                  {t('nav.logout')}
                </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
