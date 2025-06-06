import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    //在開發環境下(前後端分離時)將圖片請求代理到後端
    proxy: {
      "/pic": {
        target: "http://localhost:3000",
        changeOrigin: true,
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
