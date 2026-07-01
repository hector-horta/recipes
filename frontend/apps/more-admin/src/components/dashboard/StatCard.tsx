import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

const T = {
  surface:    'var(--surface-organic)',
  outline:    'var(--outline)',
  primary:    'var(--brand-primary)',
  primary15:  'rgba(0, 255, 194, 0.15)',
  primary08:  'rgba(0, 255, 194, 0.08)',
  danger:     'var(--danger)',
  danger08:   'rgba(248, 113, 113, 0.08)',
  danger15:   'rgba(248, 113, 113, 0.15)',
  warning:    'var(--warning)',
  warning08:  'rgba(255, 183, 3, 0.08)',
  warning15:  'rgba(255, 183, 3, 0.15)',
  neutral08:  'rgba(131, 149, 140, 0.08)',
  neutral15:  'rgba(131, 149, 140, 0.15)',
  outlineSt:  'var(--outline-strong)',
} as const;

const variantConfig = {
  success: { color: T.primary, bg: T.primary08, border: T.primary15 },
  info:    { color: T.outlineSt, bg: T.neutral08, border: T.neutral15 },
  danger:  { color: T.danger, bg: T.danger08, border: T.danger15 },
  warning: { color: T.warning, bg: T.warning08, border: T.warning15 },
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  variant: 'success' | 'danger' | 'info' | 'warning';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, variant }) => {
  const v = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      style={{
        backgroundColor: T.surface,
        border: `1px solid ${T.outline}`,
        borderRadius: '1.25rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: v.bg, color: v.color, border: `1px solid ${v.border}` }}
        >
          {icon}
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--brand-text-muted)' }}>
            {title}
          </p>
          <p className="text-2xl font-black mt-1" style={{ color: v.color }}>
            {value}
          </p>
        </div>
      </div>
      <div className="pt-4 flex items-center gap-2 text-xs" style={{ borderTop: '1px solid var(--outline)', color: 'var(--brand-text-muted)' }}>
        <Clock size={14} />
        {description}
      </div>
    </motion.div>
  );
};
