import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Tags, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';

export const Sidebar: React.FC = () => {
  const { logout, user } = useAuth();

  const navItems = [
    { to: '/tenants', icon: Users, label: 'Tenants' },
    { to: '/recipes', icon: BookOpen, label: 'Recetas Globales' },
    { to: '/tags', icon: Tags, label: 'Tags' },
  ];

  return (
    <aside className="w-64 bg-brand-forest text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-sage rounded-lg flex items-center justify-center">M</div>
          MORE Admin
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-brand-sage text-white shadow-lg shadow-brand-sage/20'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-4">
        <div className="px-4 py-2">
          <p className="text-sm text-white/40">Conectado como</p>
          <p className="text-sm font-medium truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
