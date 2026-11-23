/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        taxi: {
          yellow: '#F5B041',
          gold: '#E59866',
          dark: '#1C2833',
          navy: '#2C3E50',
          light: '#F8F9FA'
        }
      }
    },
  },
  plugins: [],
}
