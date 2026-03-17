/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
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
      },
      backgroundColor: {
        'organic': 'var(--brand-cream)',
      }
    },
  },
  plugins: [],
}
