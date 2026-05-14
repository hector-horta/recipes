import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Tags, BookOpen, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';

export const Sidebar: React.FC = () => {
  const { logout, user } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('common.dashboard') },
    { to: '/tenants', icon: Users, label: t('common.tenants') },
    { to: '/recipes', icon: BookOpen, label: t('common.recipes') },
    { to: '/tags', icon: Tags, label: t('common.tags') },
  ];

  return (
    <aside className="w-64 bg-brand-forest text-white flex flex-col min-h-screen relative z-20">
      <div className="p-8 border-b border-white/5">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-black tracking-tighter flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-brand-sage rounded-2xl flex items-center justify-center shadow-lg shadow-brand-sage/20 rotate-3">
            <span className="text-white text-xl">M</span>
          </div>
          <span className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            MORE
          </span>
        </motion.h1>
      </div>

      <nav className="flex-1 p-6 space-y-3">
        {navItems.map((item, idx) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="block group"
          >
            {({ isActive }) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-brand-sage rounded-2xl shadow-lg shadow-brand-sage/20 -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`font-bold text-sm tracking-tight ${isActive ? 'translate-x-1' : ''} transition-transform`}>
                  {item.label}
                </span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-4">
        <div className="px-4 py-2">
          <p className="text-sm text-white/40">{t('sidebar.connected_as')}</p>
          <p className="text-sm font-medium truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">{t('sidebar.logout')}</span>
        </button>
      </div>
    </aside>
  );
};
