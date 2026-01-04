import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Listen on all network interfaces for Docker
    port: 8080, // Port for Docker container (matches nginx upstream)
    strictPort: true, // Fail if port is already in use
    watch: {
      usePolling: true, // Enable polling for file changes in Docker
    },
    hmr: {
      // When accessed through nginx on port 80, use the same origin for WebSocket
      // When accessed directly on port 8080, use port 8080
      clientPort: process.env.NODE_ENV === 'production' ? 80 : 8080,
      host: 'localhost',
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
