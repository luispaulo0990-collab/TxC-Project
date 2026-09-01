/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        unita: {
          orange: "#FE5000",
          p447: "#373A36",
          cool2: "#D0D0CE",
        },
      },
    },
  },
  plugins: [],
}
