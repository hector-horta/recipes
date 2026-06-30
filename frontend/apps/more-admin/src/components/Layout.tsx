import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export const Layout: React.FC = () => {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream relative">
        <div className="absolute inset-0 bg-dots opacity-10" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-brand-sage border-r-transparent"></div>
          <p className="text-brand-forest font-black tracking-widest text-xs uppercase animate-pulse">Iniciando Sistema</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-brand-cream font-sans selection:bg-brand-sage/30 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-dots opacity-[0.15] pointer-events-none" />
      <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-brand-sage/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[10%] -left-[5%] w-[40%] h-[40%] bg-brand-teal/5 rounded-full blur-[120px] pointer-events-none" />
      
      <Sidebar />
      <main className="flex-1 overflow-auto relative z-10 custom-scrollbar">
        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
