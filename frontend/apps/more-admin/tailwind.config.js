/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui-kit/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Archivo Narrow"', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          tertiary: 'var(--brand-tertiary)',
          neutral: 'var(--brand-neutral)',
          text: 'var(--brand-text)',
          'text-muted': 'var(--brand-text-muted)',
          // Legacy mappings
          mint: 'var(--brand-mint)',
          sage: 'var(--brand-sage)',
          forest: 'var(--brand-forest)',
          teal: 'var(--brand-teal)',
        },
        'ui-primary':       'var(--brand-primary)',
        'ui-primary-hover': '#00E1AB',
        'ui-surface':       'var(--brand-secondary)',
        'ui-foreground':    'var(--brand-text)',
        'ui-muted':         'var(--brand-text-muted)',
        'ui-border':        'var(--outline)',
        'ui-accent':        'var(--brand-primary)',
        'ui-accent-hover':  '#00E1AB',
      },
      borderRadius: {
        'brand-sm': 'var(--radius-sm)',
        'brand-md': 'var(--radius-md)',
        'brand-lg': 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
}
