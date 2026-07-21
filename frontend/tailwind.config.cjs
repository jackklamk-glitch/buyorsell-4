/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bos: {
          bg: "#0B0E14",
          card: "#151D2A",
          raised: "#1A2433",
          border: "#263244",
          text: "#E5E7EB",
          muted: "#94A3B8",
          buy: "#10B981",
          sell: "#EF4444",
        },
      },
      borderRadius: {
        bos: "8px",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
