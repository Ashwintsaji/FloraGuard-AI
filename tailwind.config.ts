import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canopy: {
          950: "#0B120D",
          900: "#0F1712",
          800: "#182219",
          700: "#212F22",
          600: "#31432F",
        },
        moss: {
          400: "#8FB57B",
          500: "#6F9E5A",
          600: "#4C7A52",
          700: "#3A5F40",
        },
        parchment: {
          100: "#FBF9F1",
          200: "#F5F1E6",
          300: "#EDE8D9",
          400: "#DCD4BC",
        },
        blight: {
          400: "#E08356",
          500: "#C1502E",
          600: "#9C3E23",
        },
        amber: {
          400: "#E0B24C",
          500: "#C79430",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "grain": "radial-gradient(circle at 1px 1px, rgba(237,232,217,0.05) 1px, transparent 0)",
      },
      boxShadow: {
        label: "0 1px 0 rgba(237,232,217,0.08), 0 8px 24px -8px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
