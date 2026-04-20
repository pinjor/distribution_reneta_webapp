import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Listen on all network interfaces for Docker
    port: 8080, // Port for Docker container (matches nginx upstream)
    strictPort: true, // Fail if port is already in use
    watch: {
      usePolling: true, // Enable polling for file changes in Docker
    },
    hmr:
      process.env.VITE_DISABLE_HMR === "1"
        ? false
        : {
            clientPort: process.env.NODE_ENV === "production" ? 80 : 8080,
            host: process.env.VITE_HMR_HOST || "localhost",
          },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize for Docker development
  optimizeDeps: {
    exclude: [],
  },
}));
