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
          sage: '#82A082',
          forest: '#1B4332',
          mint: '#74C69D',
          teal: '#40916C',
          cream: '#FDFCF8',
          peach: '#FFD8BE',
          text: '#1B2621',
          'text-muted': '#57635E',
        },
      },
      backgroundColor: {
        'organic': '#FDFCF8',
      }
    },
  },
  plugins: [],
}
