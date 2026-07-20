import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "@/lib/errorHandler";

installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);

// ------------------------------------------------------------------
// Service Worker — registro seguro
// ------------------------------------------------------------------
// Precisa ficar DESLIGADO em:
//   - dev (import.meta.env.DEV)
//   - dentro de iframe (o editor Lovable roda o preview em iframe)
//   - hosts de preview do Lovable (id-preview--*, preview--*, *.lovableproject.com,
//     *.lovableproject-dev.com, *.beta.lovable.dev)
//   - quando a URL tem ?sw=off  (kill-switch manual, útil se um cliente ficar
//     preso com bundle antigo depois de um deploy)
// Em qualquer um desses casos, se já existir um SW registrado antes, ele é
// removido para não continuar servindo HTML/JS antigo.
function shouldRegisterServiceWorker(): boolean {
  if (!("serviceWorker" in navigator)) return false;
  if (import.meta.env.DEV) return false;
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false; // cross-origin iframe
  }
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return false;
  }
  if (new URLSearchParams(window.location.search).get("sw") === "off") {
    return false;
  }
  return true;
}

if ("serviceWorker" in navigator) {
  if (shouldRegisterServiceWorker()) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Falha ao registrar service worker:", err);
      });
    });
  } else {
    // Ambiente onde o SW não deve rodar — remove qualquer registro antigo
    // para não servir bundle obsoleto (evita "app instalado que não atualiza").
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((r) => {
          if (r.active?.scriptURL?.endsWith("/sw.js")) {
            r.unregister().catch(() => {});
          }
        });
      })
      .catch(() => {});
  }
}
