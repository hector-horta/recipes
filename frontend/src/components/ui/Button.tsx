import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'glass' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    // Shared base classes
    const baseStyles = 'inline-flex items-center justify-center transition-all duration-300 outline-none disabled:opacity-50 disabled:cursor-not-allowed';

    // Granular sizes mimicking the previously scattered UI
    const sizeStyles = {
      sm: 'py-1.5 px-4 text-sm font-medium rounded-xl',
      md: 'py-2.5 px-6 font-medium rounded-2xl',
      lg: 'py-3.5 px-8 text-sm font-bold rounded-xl',
      xl: 'py-4 px-8 text-sm font-bold rounded-xl',
      icon: 'p-2 rounded-full',
    };

    // Variant classes mapping
    const variantStyles = {
      primary: 'text-white hover:shadow-lg hover:shadow-brand-teal/40 transform hover:-translate-y-0.5 active:scale-[0.98]',
      secondary: 'bg-white text-brand-forest border border-brand-sage/20 hover:bg-brand-sage/5 hover:border-brand-sage/40',
      ghost: 'bg-transparent text-brand-forest hover:bg-brand-sage/10 rounded-2xl',
      glass: 'bg-white/10 text-brand-forest border border-white/40 hover:bg-white/20 backdrop-blur-md',
      link: 'bg-transparent p-0 m-0 !transition-none hover:underline inline-flex items-center',
    };

    // Inline style handling specifically to encapsulate the linear-gradient so we don't need utility clashing
    const combinedStyle = variant === 'primary' 
      ? { ...style, background: 'linear-gradient(135deg, var(--brand-sage), var(--brand-teal))' } 
      : style;

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
        style={combinedStyle}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2 flex-shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2 flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
