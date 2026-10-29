import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // `npm run dev` sekalian menyalakan server API Express (port 4000), tidak perlu terminal kedua
    {
      name: "server-api",
      apply: "serve",
      configureServer() {
        import(pathToFileURL(resolve("src/server/index.js")).href);
      },
    },
  ],
  // Proxy /api requests to the local Express server during development
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/anthropic": {
        target: "https://ai.olagon.site",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/anthropic/, ""),
      },
    },
  },
});
