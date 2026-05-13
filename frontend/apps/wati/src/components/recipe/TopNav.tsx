
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../AuthContext';
import { WatiLogo } from '../WatiLogo';
import { LanguageSelector } from '../LanguageSelector';
import { Button } from '../ui/Button';
import { Settings, UserCircle, LogOut, Menu, X } from 'lucide-react';
import { logger } from '../../utils/logger';

interface TopNavProps {
  onOpenLogin: () => void;
  onOpenOnboarding: () => void;
  onLogoClick: () => void;
}

export function TopNav({ onOpenLogin, onOpenOnboarding, onLogoClick }: TopNavProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-brand-sage/10 shadow-sm/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <button 
          onClick={() => {
            logger.track('UI_HOME_CLICK', { location: 'top_nav' });
            onLogoClick();
          }}
          className="flex items-center hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint rounded-lg px-1"
          data-analytics="logo-home"
          aria-label="Wati - Home"
        >
          <WatiLogo size={124} />
        </button>

        {/* Desktop: Language Selector + Auth Actions */}
        <div className="hidden sm:flex items-center gap-2">
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
              <div className="flex items-center gap-2 pl-3 border-l border-brand-sage/20">
                <div className="w-8 h-8 rounded-full bg-brand-mint/20 flex items-center justify-center border border-brand-mint/30 shrink-0">
                  <UserCircle className="w-5 h-5 text-brand-forest" />
                </div>
                <p className="text-xs font-extrabold text-brand-forest leading-tight whitespace-nowrap max-w-[100px] truncate">{user.displayName}</p>
                <Button
                  variant="ghost"
                  onClick={logout}
                  leftIcon={<LogOut size={12} />}
                  className="text-[10px] font-bold text-danger hover:text-danger/80 hover:bg-danger/10 border border-danger/20 px-2 py-1 h-auto"
                >
                  {t('nav.logout')}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Mobile: Hamburger Menu Button */}
        <div className="sm:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-brand-sage/10 bg-white/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-brand-sage/10">
              <span className="text-sm font-bold text-brand-text-muted">Idioma</span>
              <LanguageSelector />
            </div>
            
            {!user ? (
              <Button
                onClick={() => {
                  onOpenLogin();
                  setMobileMenuOpen(false);
                }}
                variant="primary"
                size="sm"
                className="w-full justify-center"
              >
                {t('nav.login')}
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-3 pb-3 border-b border-brand-sage/10">
                  <div className="w-10 h-10 rounded-full bg-brand-mint/20 flex items-center justify-center border border-brand-mint/30">
                    <UserCircle className="w-6 h-6 text-brand-forest" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-brand-forest">{user.displayName}</p>
                  </div>
                </div>
                
                <Button
                  onClick={() => {
                    onOpenOnboarding();
                    setMobileMenuOpen(false);
                  }}
                  variant="ghost"
                  size="sm"
                  leftIcon={<Settings className="w-4 h-4" />}
                  className="w-full justify-start bg-brand-sage/10 hover:bg-brand-sage/20 border border-brand-sage/20"
                >
                  {t('nav.allergies')}
                </Button>
                
                <Button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  variant="ghost"
                  size="sm"
                  leftIcon={<LogOut className="w-4 h-4" />}
                  className="w-full justify-start text-danger hover:text-danger/80 hover:bg-danger/10 border border-danger/20"
                >
                  {t('nav.logout')}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
