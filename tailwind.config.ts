import type { Config } from "tailwindcss";

// Design tokens — see README.md "Design plan" section for rationale.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F2F1EC", // light warm-neutral drawing surface (not cream-cliché)
        surface: "#FFFFFF", // toolbar / panel surface, floats above canvas
        ink: {
          DEFAULT: "#1C1B19", // near-black warm ink for text/icons
          soft: "#6B6963", // secondary text, disabled states
          faint: "#B8B6AE", // borders, dividers
        },
        accent: {
          DEFAULT: "#1C6E8C", // "blueprint ink" — active tool, links, focus
          soft: "#E4EEF1",
        },
        presence: {
          coral: "#E8735C",
          violet: "#8B5FBF",
          moss: "#4E8F52",
          gold: "#CC9A2E",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        toolbar: "0 1px 2px rgba(28,27,25,0.06), 0 4px 16px rgba(28,27,25,0.08)",
      },
      keyframes: {
        "marching-ants": {
          to: { strokeDashoffset: "-16" },
        },
        "save-pulse": {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "20%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(1)" },
        },
      },
      animation: {
        "marching-ants": "marching-ants 0.6s linear infinite",
        "save-pulse": "save-pulse 1.1s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
