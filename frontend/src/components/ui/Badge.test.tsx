import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
    it('should render children correctly', () => {
        render(<Badge>Test Badge</Badge>);
        expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('should apply default variant styles', () => {
        const { container } = render(<Badge>Default</Badge>);
        const badge = container.firstChild as HTMLElement;
        
        expect(badge.className).toContain('bg-brand-forest/5');
        expect(badge.className).toContain('text-brand-forest');
    });

    it('should apply success variant styles', () => {
        const { container } = render(<Badge variant="success">Success</Badge>);
        const badge = container.firstChild as HTMLElement;
        
        expect(badge.className).toContain('bg-emerald-50');
        expect(badge.className).toContain('text-emerald-700');
        expect(badge.className).toContain('border-emerald-200');
    });

    it('should apply warning variant styles', () => {
        const { container } = render(<Badge variant="warning">Warning</Badge>);
        const badge = container.firstChild as HTMLElement;
        
        expect(badge.className).toContain('bg-amber-50');
        expect(badge.className).toContain('text-amber-900');
    });

    it('should apply danger variant styles', () => {
        const { container } = render(<Badge variant="danger">Danger</Badge>);
        const badge = container.firstChild as HTMLElement;
        
        expect(badge.className).toContain('bg-red-50');
        expect(badge.className).toContain('text-red-900');
    });

    it('should apply glass variant styles', () => {
        const { container } = render(<Badge variant="glass">Glass</Badge>);
        const badge = container.firstChild as HTMLElement;
        
        expect(badge.className).toContain('backdrop-blur-md');
        expect(badge.className).toContain('bg-white/90');
    });

    it('should apply default size styles', () => {
        const { container } = render(<Badge>Default Size</Badge>);
        const badge = container.firstChild as HTMLElement;
        
        expect(badge.className).toContain('px-2.5');
        expect(badge.className).toContain('py-1');
        expect(badge.className).toContain('text-[10px]');
    });

    it('should apply md size styles', () => {
        const { container } = render(<Badge size="md">Medium</Badge>);
        const badge = container.firstChild as HTMLElement;
        
        expect(badge.className).toContain('px-3');
        expect(badge.className).toContain('py-1.5');
        expect(badge.className).toContain('text-xs');
    });

    it('should apply pill size styles', () => {
        const { container } = render(<Badge size="pill">Pill</Badge>);
        const badge = container.firstChild as HTMLElement;
        
        expect(badge.className).toContain('rounded-full');
    });

    it('should render leftIcon when provided', () => {
        render(<Badge leftIcon={<span data-testid="icon">🔔</span>}>With Icon</Badge>);
        expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should pass through HTML attributes', () => {
        render(<Badge data-testid="custom-badge" role="status">Accessible</Badge>);
        const badge = screen.getByTestId('custom-badge');
        expect(badge).toHaveAttribute('role', 'status');
    });

    it('should apply custom className', () => {
        const { container } = render(<Badge className="custom-class">Custom</Badge>);
        const badge = container.firstChild as HTMLElement;
        
        expect(badge.className).toContain('custom-class');
    });
});
