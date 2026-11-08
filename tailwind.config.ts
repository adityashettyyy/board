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
        lift: "0 2px 4px rgba(28,27,25,0.05), 0 10px 28px rgba(28,27,25,0.10)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "marching-ants": {
          to: { strokeDashoffset: "-16" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.88) translateY(6px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "tool-pop": {
          "0%": { transform: "scale(0.82)" },
          "60%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        "draw-path": {
          to: { strokeDashoffset: "0" },
        },
        "float-a": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(14px, 10px)" },
        },
        "float-b": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-12px, 14px)" },
        },
        "blob-drift": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(30px, -24px) scale(1.08)" },
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
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "pop-in": "pop-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "slide-up": "slide-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "tool-pop": "tool-pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "draw-path": "draw-path 1.4s cubic-bezier(0.65, 0, 0.35, 1) forwards",
        "float-a": "float-a 6s ease-in-out infinite",
        "float-b": "float-b 7.5s ease-in-out infinite",
        "blob-drift": "blob-drift 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
