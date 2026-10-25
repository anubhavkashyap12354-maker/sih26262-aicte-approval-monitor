/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="abyss"]'],
  theme: {
    extend: {
      colors: {
        abyss: {
          bg: '#02080c',
          panel: 'rgba(5, 18, 26, 0.82)',
          line: 'rgba(133, 205, 220, 0.18)',
          text: '#eaf6f7',
          muted: '#9bb2b9',
          accent: '#5de1ee',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
