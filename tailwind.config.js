export default {
  darkMode: "class",
  content: [
    "./src/server/views/**/*.{ejs,js}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f5f5f5",
          100: "#e5e5e5",
          200: "#d4d4d4",
          300: "#a3a3a3",
          400: "#737373",
          500: "#525252",
          600: "#404040",
          700: "#262626",
          800: "#171717",
          900: "#0a0a0a",
        },
        dark: {
          bg: "#0b0b0b",
          surface: "#111111",
          border: "#1f1f1f",
          text: "#e5e5e5",
          muted: "#9ca3af",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  }, 
  plugins: [require("@tailwindcss/typography")],
};
