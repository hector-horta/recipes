import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
export const Button = forwardRef(({ className = '', variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, fullWidth = false, children, disabled, style, ...props }, ref) => {
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
    // Variant classes — using semantic ui-* tokens
    const variantStyles = {
        primary: 'text-white hover:shadow-lg hover:shadow-ui-primary/40 transform hover:-translate-y-0.5 active:scale-[0.98]',
        secondary: 'bg-white text-ui-foreground border border-ui-border hover:bg-ui-primary/5 hover:border-ui-primary/40',
        ghost: 'bg-transparent text-ui-foreground hover:bg-ui-primary/10 rounded-2xl',
        glass: 'bg-white/10 text-ui-foreground border border-white/40 hover:bg-white/20 backdrop-blur-md',
        link: 'bg-transparent p-0 m-0 !transition-none hover:underline inline-flex items-center',
    };
    // Primary gradient uses CSS custom properties that each app defines
    const combinedStyle = variant === 'primary'
        ? { ...style, background: 'linear-gradient(135deg, var(--ui-gradient-from), var(--ui-gradient-to))' }
        : style;
    return (_jsxs("button", { ref: ref, className: `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`, style: combinedStyle, disabled: disabled || isLoading, ...props, children: [isLoading && _jsx(Loader2, { className: "w-5 h-5 mr-2 animate-spin" }), !isLoading && leftIcon && _jsx("span", { className: "mr-2 flex-shrink-0", children: leftIcon }), children, !isLoading && rightIcon && _jsx("span", { className: "ml-2 flex-shrink-0", children: rightIcon })] }));
});
Button.displayName = 'Button';
//# sourceMappingURL=Button.js.map