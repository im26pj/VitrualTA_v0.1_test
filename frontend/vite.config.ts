import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/pic": {
        target: "https://virtualta.xyz:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/api": {
        target: "https://virtualta.xyz:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  publicDir: "./static",
  base: "/",
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
});
