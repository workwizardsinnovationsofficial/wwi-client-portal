/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wwi: {
          bg: '#FFFFFF',
          text: '#171717',
          muted: '#666666',
          surface: '#F5F5F5',
          border: '#E5E5E5',
          selected: '#EDEDED',
          dark: '#111111',
          accent: '#171717',
          danger: '#DC2626',
          warning: '#D97706',
          success: '#16A34A',
          info: '#2563EB'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ]
      }
    },
  },
  plugins: [],
}
