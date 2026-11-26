import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devPort = Number(process.env.VITE_DEV_PORT || 15175);
const ISOLATED_HTML = "/isolated-workflow.html";

function isolatedWorkflowIndex(): Plugin {
  const forceIsolated = (url: string | undefined): string | undefined => {
    if (!url) return url;
    const [pathname, qs] = url.split("?");
    const suffix = qs ? `?${qs}` : "";
    if (pathname === "/" || pathname === "/index.html") {
      return `${ISOLATED_HTML}${suffix}`;
    }
    return url;
  };

  const isAsset = (pathname: string) =>
    pathname.startsWith("/src") ||
    pathname.startsWith("/@") ||
    pathname.startsWith("/node_modules") ||
    pathname.startsWith(ISOLATED_HTML) ||
    (pathname.includes(".") && pathname !== "/index.html");

  return {
    name: "isolated-workflow-index",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = forceIsolated(req.url);
        next();
      });
      return () => {
        server.middlewares.use((req, _res, next) => {
          req.url = forceIsolated(req.url);
          const pathname = (req.url || "").split("?")[0];
          if (isAsset(pathname)) {
            next();
            return;
          }
          req.url = ISOLATED_HTML;
          next();
        });
      };
    },
  };
}

export default defineConfig({
  appType: "mpa",
  plugins: [react(), isolatedWorkflowIndex()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: devPort,
    strictPort: true,
    watch: {
      ignored: ["**/playwright-report/**", "**/test-results/**", "**/e2e/logs/**"],
    },
  },
  build: {
    outDir: "dist-isolated-workflow",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "isolated-workflow.html"),
    },
  },
});
