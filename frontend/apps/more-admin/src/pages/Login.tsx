import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, isLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      logger.info('ADMIN_LOGIN_SUCCESS', { email });
      navigate('/tenants');
    } catch (err) {
      logger.error('ADMIN_LOGIN_FAILED', {
        email,
        error: err instanceof Error ? err.message : 'Unknown',
      });
    }
  };

  const T = {
    primary:    'var(--brand-primary)',
    primary07:  'rgba(0, 255, 194, 0.07)',
    primary12:  'rgba(0, 255, 194, 0.12)',
    primary15:  'rgba(0, 255, 194, 0.15)',
    primary25:  'rgba(0, 255, 194, 0.25)',
    teal05:     'rgba(0, 209, 160, 0.05)',
    danger:     'var(--danger)',
    danger10:   'rgba(248, 113, 113, 0.10)',
    danger30:   'rgba(248, 113, 113, 0.30)',
    text:       'var(--brand-text)',
    muted:      'var(--brand-text-muted)',
    surface:    'var(--surface-organic)',
    surfaceHi:  'var(--surface-light)',
    surfaceLo:  'var(--surface-dark)',
    lowest:     'var(--surface-lowest)',
    outline:    'var(--outline)',
    black65:    'rgba(0, 0, 0, 0.65)',
    hover:      'var(--brand-teal)',
  } as const;

  const inputStyle: React.CSSProperties = {
    backgroundColor: T.surfaceHi,
    border: `1px solid ${T.outline}`,
    borderRadius: '0.75rem',
    color: T.text,
    caretColor: T.primary,
    width: '100%',
    height: '3rem',
    padding: '0 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = T.primary;
    e.target.style.boxShadow = `0 0 0 3px ${T.primary12}`;
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = T.outline;
    e.target.style.boxShadow = 'none';
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: T.surfaceLo }}
    >
      {/* Ambient glow top-left */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-10%',
          left: '-5%',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${T.primary07} 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />
      {/* Ambient glow bottom-right */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-10%',
          right: '-5%',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${T.teal05} 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10"
        style={{
          width: '100%',
          maxWidth: '26rem',
          backgroundColor: T.surface,
          border: `1px solid ${T.outline}`,
          borderRadius: '1.5rem',
          padding: '2.5rem',
          boxShadow: `0 32px 64px -16px ${T.black65}`,
        }}
      >
        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            className="inline-flex items-center justify-center"
            style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '1.25rem',
              backgroundColor: T.lowest,
              border: `1px solid ${T.outline}`,
              color: T.primary,
              boxShadow: `0 0 32px ${T.primary15}`,
              marginBottom: '1.5rem',
            }}
          >
            <ShieldCheck size={40} />
          </motion.div>

          <h2
            style={{
              color: T.text,
              fontSize: '2.25rem',
              fontWeight: 900,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {t('auth.login_title')}
          </h2>
          <p
            style={{
              color: T.muted,
              fontSize: '0.875rem',
              fontWeight: 500,
              marginTop: '0.5rem',
            }}
          >
            {t('auth.login_subtitle')}
          </p>
        </div>

        {/* ── Form ── */}
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          onSubmit={handleSubmit}
          data-bwignore="true"
        >
          {/* Error banner */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  backgroundColor: T.danger10,
                  border: `1px solid ${T.danger30}`,
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1rem',
                  color: T.danger,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {error === 'Acceso denegado. Se requiere rol de super_admin.'
                  ? t('auth.error_denied')
                  : t('auth.error_generic')}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                style={{
                  color: T.muted,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginLeft: '0.25rem',
                }}
              >
                {t('auth.email_label')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@more.com"
                required
                autoComplete="username email"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                style={{
                  color: T.muted,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginLeft: '0.25rem',
                }}
              >
                {t('auth.password_label')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                data-bwignore
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
          </div>

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: T.primary,
              color: T.lowest,
              borderRadius: '0.875rem',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              boxShadow: `0 0 24px ${T.primary25}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontFamily: 'inherit',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = T.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = T.primary;
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>{t('auth.verifying')}</span>
              </>
            ) : (
              <>
                <span>{t('auth.submit_button')}</span>
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  →
                </motion.span>
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.6rem',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 700,
            marginTop: '1.5rem',
            color: T.muted,
            opacity: 0.4,
          }}
        >
          {t('auth.restricted_access')}
        </p>
      </motion.div>
    </div>
  );
};
