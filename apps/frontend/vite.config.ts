import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^#(.+)$/, replacement: path.resolve(__dirname, "src/$1") },
      {
        find: /^@distributed-systems\/(.+)$/,
        replacement: path.resolve(__dirname, "../../packages/$1/src/index.ts"),
      },
    ],
  },
  optimizeDeps: {
    include: ["@distributed-systems/shared"],
  },
  server: {
    proxy: {
      "/invoices": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/login": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/logout": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/me": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/register": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
