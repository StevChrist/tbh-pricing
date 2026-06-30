import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#00B4D8",
          50: "#E0F7FC",
          100: "#B3EDF7",
          200: "#80E2F2",
          300: "#4DD7ED",
          400: "#26CCE8",
          500: "#00B4D8",
          600: "#009FC2",
          700: "#0085A3",
          800: "#006B84",
          900: "#004F63",
        },
        background: {
          dark: "#0F1117",
          light: "#F8FAFC",
        },
        surface: {
          dark: "#1A1D27",
          "dark-2": "#21253A",
          light: "#FFFFFF",
          "light-2": "#F1F5F9",
        },
        rarity: {
          common: "#B0B0B0",
          uncommon: "#4CAF50",
          rare: "#2196F3",
          epic: "#9C27B0",
          legendary: "#FFD700",
          unique: "#FF6B35",
        },
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.4)",
        glow: "0 0 20px rgba(0, 180, 216, 0.25)",
      },
      animation: {
        "skeleton-pulse": "skeleton-pulse 1.5s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
      },
      keyframes: {
        "skeleton-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
