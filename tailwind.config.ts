import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bamyon: {
          // Function form gives Tailwind an opacityValue to compute
          // bg-bamyon-green/5 etc. at build time — a plain
          // var(--color-accent) string can't support that.
          green: ({ opacityValue }: { opacityValue?: string }) =>
            opacityValue !== undefined
              ? `rgb(var(--color-accent-rgb) / ${opacityValue})`
              : `rgb(var(--color-accent-rgb))`,
          greenDark: ({ opacityValue }: { opacityValue?: string }) =>
            opacityValue !== undefined
              ? `rgb(var(--color-accent-dark-rgb) / ${opacityValue})`
              : `rgb(var(--color-accent-dark-rgb))`,
          amber: "#f5a623",
          amberDark: "#d98e0f",
          cream: "#f7f7f5",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
