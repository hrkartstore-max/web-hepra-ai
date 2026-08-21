import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#D4FA5C",
        dark: "#102A27",
        surface: "#0B1E1C",
        panel: "#132E2B",
        border: "#1E3D39",
        muted: "#7FA39D"
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
