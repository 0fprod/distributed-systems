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
});
