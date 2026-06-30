import React from 'react';
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'glass';
export type BadgeSize = 'sm' | 'md' | 'pill';
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    size?: BadgeSize;
    leftIcon?: React.ReactNode;
}
export declare function Badge({ children, variant, size, leftIcon, className, ...props }: BadgeProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Badge.d.ts.map