import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
