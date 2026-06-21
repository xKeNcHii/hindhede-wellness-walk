/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
      },
      colors: {
        forest: {
          950: "#0b1a12",
          900: "#10241a",
          800: "#163322",
          700: "#1f6f43",
          500: "#2f9c5e",
          300: "#6ee7a0",
        },
        sand: "#f4e9c1",
        clay: "#c97b4a",
      },
      boxShadow: {
        pixel: "4px 4px 0 0 rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};
