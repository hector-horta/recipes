import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '@wati/ui-kit';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/tenants');
    } catch (err) {
      // Error is handled in context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-dots opacity-[0.15] pointer-events-none" />
      <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-brand-sage/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-brand-teal/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-brand-forest/10 border border-brand-sage/20 relative z-10"
      >
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-forest text-white mb-6 shadow-xl shadow-brand-forest/20 rotate-3"
          >
            <ShieldCheck size={40} />
          </motion.div>
          <h2 className="text-4xl font-black text-brand-forest tracking-tight">MORE Admin</h2>
          <p className="mt-2 text-brand-text-muted font-medium">Portal de Administración Global</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-forest ml-1">Email Corporativo</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@more.com"
                required
                className="h-12 rounded-xl bg-brand-cream/50 border-none focus:ring-2 focus:ring-brand-sage/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-forest ml-1">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 rounded-xl bg-brand-cream/50 border-none focus:ring-2 focus:ring-brand-sage/30"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-brand-forest hover:bg-brand-forest/90 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-brand-forest/20 text-lg group"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                <span>Verificando...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Entrar al Portal</span>
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  →
                </motion.span>
              </div>
            )}
          </Button>
        </form>

        <p className="text-center text-[10px] text-brand-text-muted uppercase tracking-widest font-bold opacity-50">
          Acceso Restringido • Super Admin Only
        </p>
      </motion.div>
    </div>
  );
};
