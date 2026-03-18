/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        red: {
          primary: '#C0121F',
          hover: '#a00f1a',
          light: '#fdf2f2',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['Outfit', 'sans-serif'],
      },
      maxWidth: {
        layout: '1200px',
      },
    },
  },
  plugins: [],
}
