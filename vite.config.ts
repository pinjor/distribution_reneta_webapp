/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devPort = Number(process.env.VITE_DEV_PORT || 5173);
// When behind nginx on :80, set VITE_HMR_CLIENT_PORT=80 so the browser WebSocket uses the proxy
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || devPort);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Listen on all network interfaces for Docker
    port: devPort, // 5173 locally; Docker sets VITE_DEV_PORT=8080
    strictPort: false,
    watch: {
      usePolling: true, // Enable polling for file changes in Docker
    },
    hmr:
      process.env.VITE_DISABLE_HMR === "1"
        ? false
        : {
            clientPort: hmrClientPort,
            host: process.env.VITE_HMR_HOST || "localhost",
          },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  // Optimize for Docker development
  optimizeDeps: {
    exclude: [],
  },
}));
