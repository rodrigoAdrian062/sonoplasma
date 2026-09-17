import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const packageVersion = process.env.npm_package_version || "0.0.0";
const buildVersion = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || packageVersion;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            // HTML/navegações: sempre rede primeiro (evita tela branca após deploy)
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-nav",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 30 },
            },
          },
          {
            // Assets versionados do build e fontes externas (Google Fonts)
            urlPattern: ({ request, sameOrigin }) =>
              (sameOrigin && ["script", "style", "font", "image"].includes(request.destination)) ||
              request.url.includes("fonts.googleapis.com") ||
              request.url.includes("fonts.gstatic.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache para áudios (arquivos diretos do storage)
            urlPattern: ({ request }) => request.destination === "audio",
            handler: "CacheFirst",
            options: {
              cacheName: "audio-files",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              rangeRequests: true, // Importante para streaming parcial de áudio
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Chunks conservadores: qualquer coisa que dependa de React fica junto
        // do próprio React para evitar "createContext is undefined" no bundle
        // publicado por ordem de carregamento entre chunks.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("lucide-react")) return "vendor-icons";
          // Todo o resto (react, react-dom, react-router, radix, tanstack,
          // dnd-kit, scheduler, react-is, use-sync-external-store, etc.)
          // fica no mesmo chunk para preservar a ordem de inicialização.
          return "vendor";
        },
      },
    },
  },
}));
