import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        doodle: {
          cream: "#f7f0e4",
          purple: "#b124d5",
          green: "#2ecc71",
          yellow: "#f4d03f",
          sky: "#5dade2",
          pink: "#ff6b9d",
        },
      },
      fontFamily: {
        jua: ["var(--font-jua)", "cursive"],
        gowun: ["var(--font-gowun)", "sans-serif"],
      },
      boxShadow: {
        doodle:
          "4px 4px 0 #2ecc71, 8px 8px 0 #f4d03f",
        "doodle-sm": "2px 2px 0 #2ecc71, 4px 4px 0 #f4d03f",
      },
    },
  },
  plugins: [],
};
export default config;
