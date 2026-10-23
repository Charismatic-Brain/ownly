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
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"SF Pro"',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        // Full teal ramp reserved for sovereign primary accents & active states
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
          950: '#070b14',
        },
      },
      boxShadow: {
        card: '0 1px 0 0 rgb(255 255 255 / 0.05) inset, 0 8px 24px -12px rgb(0 0 0 / 0.6)',
        lift: '0 1px 0 0 rgb(255 255 255 / 0.08) inset, 0 18px 40px -18px rgb(0 0 0 / 0.8), 0 0 0 1px rgb(20 184 166 / 0.20)',
        modal: '0 1px 0 0 rgb(255 255 255 / 0.10) inset, 0 24px 48px -12px rgb(0 0 0 / 0.75)',
        segmented: '0 1px 2px 0 rgb(0 0 0 / 0.4), 0 1px 0 0 rgb(255 255 255 / 0.08) inset',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
        snappy: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out forwards',
        'modal-in': 'modalIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
