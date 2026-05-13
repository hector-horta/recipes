import { jsxs as _jsxs } from "react/jsx-runtime";
export function Badge({ children, variant = 'neutral', size = 'sm', leftIcon, className = '', ...props }) {
    const variantStyles = {
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-900 border-amber-200',
        danger: 'bg-red-50 text-red-900 border-red-200',
        neutral: 'bg-ui-primary/5 text-ui-foreground border-ui-primary/10',
        glass: 'backdrop-blur-md bg-white/90 text-slate-700 shadow-sm border-slate-200/50'
    };
    const sizeStyles = {
        sm: 'px-2.5 py-1 rounded-md text-[10px]',
        md: 'px-3 py-1.5 rounded-md text-xs',
        pill: 'px-3 py-1.5 rounded-full text-xs box-border'
    };
    return (_jsxs("span", { className: `
        inline-flex items-center gap-1.5 font-bold tracking-wide uppercase border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `, ...props, children: [leftIcon, children] }));
}
//# sourceMappingURL=Badge.js.map