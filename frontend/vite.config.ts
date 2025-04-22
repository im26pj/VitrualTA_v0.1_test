import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    open: true,
  },
  publicDir: "./static",
  base: "/",
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
});
