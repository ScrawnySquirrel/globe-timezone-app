import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: "index.html",
    },
  },
  server: {
    port: 5173,
  },
});
