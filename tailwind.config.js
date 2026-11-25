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
          "orange-hover": "#E04700",
          "orange-soft": "#FFF1EA",
          ink: "#231F20",
          p447: "#373A36",
          cool2: "#D0D0CE",
        },
        ink: {
          50: "#F8F7F6", 100: "#F0EEEC", 200: "#E2DFDC", 300: "#C9C4C0", 400: "#A19B96",
          500: "#77716D", 600: "#57524F", 700: "#3D3937", 800: "#2B2827", 900: "#1A1817",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: { control: "10px", card: "16px" },
      boxShadow: {
        card: "0 1px 2px rgb(26 24 23 / 0.04), 0 4px 18px rgb(26 24 23 / 0.05)",
        hover: "0 2px 4px rgb(26 24 23 / 0.05), 0 10px 28px rgb(26 24 23 / 0.08)",
        overlay: "0 10px 30px rgb(26 24 23 / 0.18)",
      },
    },
  },
  plugins: [],
}
