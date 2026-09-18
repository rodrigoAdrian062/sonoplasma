// Registro do service worker (suporte offline) — ÚNICO ponto de registro.
// Nunca registra em dev, dentro de iframe, nos hosts de preview do Lovable
// ou quando a URL tem ?sw=off. Nesses casos, remove registros antigos.

const SW_URL = "/sw.js";

function isBlockedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
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
    return true;
  }
  return new URLSearchParams(window.location.search).get("sw") === "off";
}

async function unregisterAppSW(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => (r.active?.scriptURL || r.installing?.scriptURL || "").endsWith(SW_URL))
        .map((r) => r.unregister().catch(() => false))
    );
  } catch {
    /* noop */
  }
}

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  if (isBlockedContext()) {
    void unregisterAppSW();
    return;
  }

  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true, onRegisterError: () => {} });
    })
    .catch(() => {});
}
