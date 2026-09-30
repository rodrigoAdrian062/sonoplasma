import { ReactNode, useEffect, useState } from 'react';

function wasPageReloaded() {
  return performance.getEntriesByType('navigation')[0]?.type === 'reload';
}

export function ReloadNotice({ children }: { children: ReactNode }) {
  const [isReloaded, setIsReloaded] = useState(wasPageReloaded);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r')) {
        event.preventDefault();
        window.location.reload();
      }
    };

    if (!isReloaded) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReloaded]);

  return (
    <>
      {children}
      {!isReloaded && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 p-6 text-center" role="alertdialog" aria-modal="true" aria-labelledby="reload-notice-title">
          <div className="max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 id="reload-notice-title" className="mb-3 text-xl font-semibold text-foreground">Atualize a tela para continuar</h2>
            <p className="text-muted-foreground">Pressione F5 (ou Ctrl+R) para atualizar a página e liberar o sistema.</p>
          </div>
        </div>
      )}
    </>
  );
}
