import { Plugin, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";
import svgr from "vite-plugin-svgr";

const forceUtf8TextHeaders = (): Plugin => ({
  name: "force-utf8-text-headers",
  configureServer(server) {
    const middleware: Parameters<typeof server.middlewares.use>[0] = (req, res, next) => {
      const originalSetHeader = res.setHeader.bind(res);

      (res as any).setHeader = (name: string, value: unknown) => {
        const normalizedName = String(name).toLowerCase();
        if (normalizedName === "content-type") {
          const contentType = typeof value === "string" ? value : "";
          if (
            /^(text\/html|text\/css|application\/javascript|text\/javascript|application\/json|text\/json)\b/i.test(
              contentType,
            )
          ) {
            const baseType = contentType.split(";")[0].trim();
            return originalSetHeader("Content-Type", `${baseType}; charset=utf-8`);
          }
        }
        return originalSetHeader(name as any, value as any);
      };

      next();
    };

    server.middlewares.use(middleware);
  },
  configurePreviewServer(server) {
    const middleware: Parameters<typeof server.middlewares.use>[0] = (req, res, next) => {
      const originalSetHeader = res.setHeader.bind(res);

      (res as any).setHeader = (name: string, value: unknown) => {
        const normalizedName = String(name).toLowerCase();
        if (normalizedName === "content-type") {
          const contentType = typeof value === "string" ? value : "";
          if (
            /^(text\/html|text\/css|application\/javascript|text\/javascript|application\/json|text\/json)\b/i.test(
              contentType,
            )
          ) {
            const baseType = contentType.split(";")[0].trim();
            return originalSetHeader("Content-Type", `${baseType}; charset=utf-8`);
          }
        }
        return originalSetHeader(name as any, value as any);
      };

      next();
    };

    server.middlewares.use(middleware);
  },
});

export default defineConfig({
  base: "/",
  publicDir: "public",
  build: {
    outDir: "build/react",
  },
  plugins: [
    forceUtf8TextHeaders(),
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        titleProp: true,
      },
      include: "**/*.svg",
    }),
    viteStaticCopy({
      targets: [
        {
          src: "build/unity/",
          dest: "build",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      "@": path.resolve(__dirname, "./src"),
      events: "events",
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
