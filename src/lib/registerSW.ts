// Registro do service worker (suporte offline) — ÚNICO ponto de registro.
// Nunca registra em dev, dentro de iframe, nos hosts de preview do Lovable
// ou quando a URL tem ?sw=off. Nesses casos, remove registros antigos.

const SW_URL = "/sw.js";
const SW_RELOAD_KEY = "sonoplasma:sw-controller-reload";

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

  // Um novo service worker pode assumir o controle enquanto a página ainda
  // está usando arquivos da versão anterior. Isso é especialmente problemático
  // para os AudioWorklets: o player fica com módulos de versões diferentes até
  // o usuário atualizar manualmente. Recarregamos uma única vez por aba quando
  // o controller muda, garantindo que HTML, JS e worklets venham do mesmo build.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    try {
      if (window.sessionStorage.getItem(SW_RELOAD_KEY)) return;
      window.sessionStorage.setItem(SW_RELOAD_KEY, "1");
    } catch {
      // Se o storage não estiver disponível, ainda é seguro atualizar uma vez.
    }
    window.location.reload();
  }, { once: true });

  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onRegisteredSW: (_swUrl: string, registration?: ServiceWorkerRegistration) => {
          // Força a checagem da versão publicada na entrada do sistema, sem
          // depender do intervalo padrão do navegador.
          void registration?.update().catch(() => {});
        },
        onRegisterError: () => {},
      });
    })
    .catch(() => {});
}
