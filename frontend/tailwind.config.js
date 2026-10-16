/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Full teal ramp. Previously 200/300/400/800 were missing, so classes like
        // `text-brand-400` (used across the app) silently rendered with no colour.
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        slate: {
          750: '#1e293b',
          850: '#151f32',
          900: '#0f172a',
          950: '#080d1a',
        },
      },
      boxShadow: {
        card: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 8px 24px -12px rgb(0 0 0 / 0.6)',
        lift: '0 1px 0 0 rgb(255 255 255 / 0.06) inset, 0 18px 40px -18px rgb(0 0 0 / 0.8), 0 0 0 1px rgb(20 184 166 / 0.18)',
      },
    },
  },
  plugins: [],
}
