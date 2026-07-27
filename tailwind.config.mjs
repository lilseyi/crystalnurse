/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm paper background — "home", not "hospital".
        paper: "#FCFBF8",
        sand: "#F4EEE4",
        "sand-soft": "#F9F5EE",
        // Deep teal-blue anchors authority + trust; keeps the brand's blue DNA.
        deep: "#0F4A5C",
        brand: {
          DEFAULT: "#1C7FA8",
          50: "#EAF4F9",
          100: "#D3E9F2",
          600: "#166a8d",
          700: "#114B5F",
        },
        sky: "#6FB7DC",
        // Single warm accent — the "care"/human note, used sparingly.
        care: "#E0855C",
        "care-soft": "#F6E4D8",
        // Warm slate text instead of cold gray.
        ink: "#17262C",
        muted: "#54646C",
      },
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        body: ["'Figtree'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: { content: "72rem", prose: "44rem" },
      boxShadow: {
        soft: "0 6px 24px -10px rgba(15,74,92,0.14)",
        card: "0 14px 40px -18px rgba(15,74,92,0.22)",
      },
      borderRadius: { pill: "9999px" },
    },
  },
  plugins: [],
};
