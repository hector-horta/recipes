import type { RecipeFormData } from './types';

export const INITIAL_FORM_STATE: RecipeFormData = {
  title: '',
  titleEn: '',
  // slug: '',
  prepTimeMinutes: 0,
  cookTimeMinutes: 0,
  servings: 1,
  difficulty: 'medium',
  status: 'draft',
  safetyLevel: 'safe',
  ingredients: [],
  instructions: [],
  tags: [],
  imageUrl: ''
};

// ─── Design tokens ─────────────────────────────────────────────────────────
export const T = {
  dark:      'var(--surface-dark)',
  dark80:    'rgba(16, 20, 23, 0.8)',
  surface:   'var(--surface-organic)',
  surfaceHi: 'var(--surface-light)',
  outline:   'var(--outline)',
  text:      'var(--brand-text)',
  muted:     'var(--brand-text-muted)',
  primary:   'var(--brand-primary)',
  primary05: 'rgba(0, 255, 194, 0.05)',
  primary08: 'rgba(0, 255, 194, 0.08)',
  primary12: 'rgba(0, 255, 194, 0.12)',
  primary15: 'rgba(0, 255, 194, 0.15)',
  primary85: 'rgba(0, 255, 194, 0.85)',
  danger:    'var(--danger)',
  danger08:  'rgba(248, 113, 113, 0.08)',
  danger12:  'rgba(248, 113, 113, 0.12)',
  danger15:  'rgba(248, 113, 113, 0.15)',
  danger20:  'rgba(248, 113, 113, 0.20)',
  warning:   'var(--warning)',
  warningBadge: 'var(--warning)',
  warning12: 'rgba(255, 183, 3, 0.12)',
  warning15: 'rgba(255, 183, 3, 0.15)',
  warning85: 'rgba(255, 183, 3, 0.85)',
  success:   'var(--success)',
  success15: 'rgba(0, 255, 194, 0.15)',
  muted12:   'rgba(185, 203, 193, 0.12)',
  grey:      'var(--brand-neutral)',
  white:     '#FFFFFF',
  black03:   'rgba(0, 0, 0, 0.03)',
} as const;

export const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.05 }
  }
};

export const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 }
};
