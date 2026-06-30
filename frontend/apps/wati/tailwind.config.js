/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui-kit/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          sage: 'var(--brand-sage)',
          forest: 'var(--brand-forest)',
          mint: 'var(--brand-mint)',
          teal: 'var(--brand-teal)',
          cream: 'var(--brand-cream)',
          peach: 'var(--brand-peach)',
          celeste: '#74C6E6',
          text: 'var(--brand-text)',
          'text-muted': 'var(--brand-text-muted)',
        },
        'ui-primary':       'var(--brand-sage)',
        'ui-primary-hover': 'var(--brand-teal)',
        'ui-surface':       'var(--brand-cream)',
        'ui-foreground':    'var(--brand-forest)',
        'ui-muted':         'var(--brand-text-muted)',
        'ui-border':        'rgba(130, 160, 130, 0.2)',
        'ui-accent':        'var(--brand-mint)',
        'ui-accent-hover':  'var(--brand-teal)',
      },
      backgroundColor: {
        'organic': 'var(--brand-cream)',
      }
    },
  },
  plugins: [],
}
