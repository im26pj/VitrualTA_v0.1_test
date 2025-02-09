// filepath: /c:/Users/a0035148/Desktop/VirtualTA-web/my-app/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

export default defineConfig({
  plugins: [react()],
  publicDir: "./static",
  base: "./",
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
});