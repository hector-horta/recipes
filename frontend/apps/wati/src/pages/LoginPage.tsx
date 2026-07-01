import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';

export function LoginPage() {
  const navigate = useNavigate();

  const handleSuccess = (_userData?: any, view?: string) => {
    navigate(view === 'register' ? '/onboarding' : '/');
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

        {/* Glass Card containing the LoginForm */}
        <div className="rounded-3xl p-8 border border-white/10 shadow-2xl" style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)'
        }}>
          <LoginForm onSuccess={handleSuccess} layout="page" />
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Datos almacenados localmente · Cifrado AES-256
        </p>
      </div>
    </div>
  );
}
