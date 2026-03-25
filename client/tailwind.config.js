export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        wa: {
          lightBg: '#efeae2',
          darkBg: '#0b141a',
          teal: '#00a884',
          tealDark: '#005c4b',
          gray: '#202c33',
          grayHover: '#2a3942',
          grayLighter: '#8696a0',
          darkPanel: '#111b21',
          msgIn: '#202c33',
          msgOut: '#005c4b',
          msgInLight: '#ffffff',
          msgOutLight: '#d9fdd3',
          header: '#1f2c34',
          inputBg: '#2a3942',
          searchBg: '#111b21',
        },
        ig: {
          black: '#000000',
          dark: '#121212',
          darkPanel: '#1a1a1a',
          gray: '#262626',
          grayLight: '#363636',
          grayText: '#a8a8a8',
          grayBorder: '#363636',
          blue: '#0095f6',
          blueHover: '#1877f2',
          red: '#ed4956',
          green: '#58c322',
          white: '#fafafa',
          elevated: '#1e1e1e',
        }
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
    require('@tailwindcss/typography'),
  ],
}
