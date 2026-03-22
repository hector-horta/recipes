import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ShieldCheck, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (!displayName.trim()) { setError('Ingresa tu nombre.'); setIsSubmitting(false); return; }
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); setIsSubmitting(false); return; }
        if (!acceptedTerms) { setError('Debes aceptar la Política de Privacidad y Términos (GDPR) para continuar.'); setIsSubmitting(false); return; }
        await register(email.trim().toLowerCase(), password, displayName.trim(), acceptedTerms);
        navigate('/onboarding');
      } else {
        await login(email.trim().toLowerCase(), password);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #334155 100%)'
    }}>
      {/* Decorative orbs */}
      <div className="absolute top-[-120px] left-[-80px] w-96 h-96 rounded-full opacity-20" style={{
        background: 'radial-gradient(circle, #34d399, transparent 70%)'
      }} />
      <div className="absolute bottom-[-100px] right-[-60px] w-80 h-80 rounded-full opacity-15" style={{
        background: 'radial-gradient(circle, #818cf8, transparent 70%)'
      }} />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
            background: 'linear-gradient(135deg, #34d399, #059669)'
          }}>
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Wati</h1>
          <p className="text-slate-400 mt-2 text-sm">Tu asistente de seguridad alimentaria</p>
        </div>

        {/* Glass Card */}
        <div className="rounded-3xl p-8 border border-white/10 shadow-2xl" style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)'
        }}>
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden mb-8 border border-white/10">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-3 text-sm font-semibold transition-all duration-300 ${
                !isRegister
                  ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-3 text-sm font-semibold transition-all duration-300 ${
                isRegister
                  ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  id="login-name"
                  type="text"
                  placeholder="Tu nombre"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                id="login-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>

            {isRegister && (
              <div className="flex items-start gap-3 mt-4">
                <input
                  type="checkbox"
                  id="acceptedTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                />
                <label htmlFor="acceptedTerms" className="text-sm text-slate-400">
                  Acepto la Política de Privacidad y Términos, incluyendo el tratamiento de mis datos de salud (GDPR).
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #34d399, #059669)'
              }}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? 'Crear Cuenta' : 'Entrar'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Datos almacenados localmente · Cifrado AES-256
        </p>
      </div>
    </div>
  );
}
