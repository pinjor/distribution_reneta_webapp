/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devPort = Number(process.env.VITE_DEV_PORT || 5173);
// Unset clientPort so the browser uses the page origin (nginx :80 or :8088).
// Set VITE_HMR_CLIENT_PORT only when HMR is not same-origin as the page.
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? Number(process.env.VITE_HMR_CLIENT_PORT)
  : undefined;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Listen on all network interfaces for Docker
    port: devPort, // 5173 locally; Docker sets VITE_DEV_PORT=8080
    strictPort: false,
    // Opening Stock tables live on disposable opening_stock_dev, not swift_distro_hub.
    proxy: {
      "/api/opening-stock": {
        target: process.env.OPENING_STOCK_PROXY_TARGET || "http://opening_stock_dev_api:8000",
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true, // Enable polling for file changes in Docker
      ignored: ["**/playwright-report/**", "**/test-results/**", "**/e2e/logs/**"],
    },
    hmr:
      process.env.VITE_DISABLE_HMR === "1"
        ? false
        : hmrClientPort
          ? {
              clientPort: hmrClientPort,
              host: process.env.VITE_HMR_HOST || "localhost",
            }
          : true,
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
