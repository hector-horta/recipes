import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'glass';
export type BadgeSize = 'sm' | 'md' | 'pill';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  leftIcon?: React.ReactNode;
}

export function Badge({ 
  children, 
  variant = 'neutral', 
  size = 'sm', 
  leftIcon,
  className = '',
  ...props 
}: BadgeProps) {
  
  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    danger: 'bg-red-50 text-red-900 border-red-200',
    neutral: 'bg-brand-forest/5 text-brand-forest border-brand-forest/10',
    glass: 'backdrop-blur-md bg-white/90 text-slate-700 shadow-sm border-slate-200/50'
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 rounded-md text-[10px]',
    md: 'px-3 py-1.5 rounded-md text-xs',
    pill: 'px-3 py-1.5 rounded-full text-xs box-border'
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 font-bold tracking-wide uppercase border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {leftIcon}
      {children}
    </span>
  );
}
