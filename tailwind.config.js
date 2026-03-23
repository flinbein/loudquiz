/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Rubik", "system-ui", "sans-serif"],
        handwritten: ["Caveat", "cursive"],
      },
      colors: {
        surface: {
          DEFAULT: "var(--color-surface)",
          elevated: "var(--color-surface-elevated)",
          card: "var(--color-surface-card)",
        },
      },
      boxShadow: {
        "neon-red": "0 0 15px 3px rgba(239, 68, 68, 0.3), 0 0 30px 5px rgba(239, 68, 68, 0.15)",
        "neon-blue": "0 0 15px 3px rgba(59, 130, 246, 0.3), 0 0 30px 5px rgba(59, 130, 246, 0.15)",
        "neon-amber": "0 0 15px 3px rgba(245, 158, 11, 0.3), 0 0 30px 5px rgba(245, 158, 11, 0.15)",
        "neon-indigo": "0 0 15px 3px rgba(99, 102, 241, 0.3), 0 0 30px 5px rgba(99, 102, 241, 0.15)",
      },
      keyframes: {
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(24px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "count-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px 2px rgba(250, 204, 21, 0.4)" },
          "50%": { boxShadow: "0 0 20px 6px rgba(250, 204, 21, 0.7)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        confetti: {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translateY(400px) rotate(720deg)",
            opacity: "0",
          },
        },
        "sound-wave": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
      },
      animation: {
        "slide-in-right":
          "slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-up": "slide-up 0.3s ease-out both",
        "count-pulse": "count-pulse 0.4s ease-in-out",
        shake: "shake 0.4s ease-in-out",
        "glow-pulse": "glow-pulse 1.5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        confetti: "confetti 1.5s ease-in forwards",
        "sound-wave": "sound-wave 2s ease-out infinite",
      },
    },
  },
  plugins: [],
};
