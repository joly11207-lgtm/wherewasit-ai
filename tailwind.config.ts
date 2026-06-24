import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        mist: "#f4efe5",
        ember: "#c96a3d",
        pine: "#28463f",
        sand: "#e7d7bd",
        gold: "#b48a41"
      },
      boxShadow: {
        glow: "0 30px 80px rgba(31, 41, 55, 0.18)"
      },
      fontFamily: {
        display: ["Georgia", "Times New Roman", "serif"],
        body: ["Avenir Next", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
