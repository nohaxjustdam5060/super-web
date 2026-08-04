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
          red: {
            DEFAULT: '#DC2626',
            hover: '#B91C1C',
            light: '#FEE2E2',
            accent: '#EF4444'
          },
          blue: {
            DEFAULT: '#1E3A8A',
            bright: '#2563EB',
            hover: '#1D4ED8',
            light: '#DBEAFE'
          },
          dark: '#0F172A',
          card: '#1E293B',
          gray: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif']
      }
    },
  },
  plugins: [],
}
