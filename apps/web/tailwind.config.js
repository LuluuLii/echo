/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        echo: {
          bg: '#fafafa',
          card: '#ffffff',
          text: '#333333',
          muted: '#666666',
          hint: '#999999',
          accent: '#4a9960',
        },
      },
    },
  },
  plugins: [],
}
