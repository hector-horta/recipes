import React, { forwardRef } from 'react';

export type InputVariant = 'glass' | 'light';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', variant = 'glass', leftIcon, rightElement, ...props }, ref) => {
    
    const variantStyles = {
      glass: 'bg-white/5 border border-white/20 text-white placeholder-white/40 focus:ring-ui-accent/50 focus:border-ui-accent/50',
      light: 'bg-white border border-ui-border text-ui-foreground placeholder-ui-muted/60 focus:ring-ui-accent/20 focus:border-ui-accent'
    };

    const iconColor = variant === 'glass' 
      ? 'text-white/40 group-focus-within:text-ui-accent' 
      : 'text-ui-muted group-focus-within:text-ui-accent';

    return (
      <div className={`relative group ${className}`}>
        {leftIcon && (
          <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors ${iconColor}`}>
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          className={`
            w-full transition-all text-sm rounded-xl py-3 focus:outline-none focus:ring-2
            ${leftIcon ? 'pl-11' : 'pl-4'}
            ${rightElement ? 'pr-11' : 'pr-4'}
            ${variantStyles[variant]}
          `}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
