import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Botão "Instalar app" (PWA). Só aparece quando o navegador oferece a
 * instalação e some depois que o app já foi instalado.
 */
export function InstallPWA({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') setDeferred(null);
  };

  return (
    <div className={compact ? "" : "fixed bottom-20 left-4 z-[60] sm:static"}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleInstall}
            variant={compact ? "ghost" : "default"}
            size={compact ? "icon" : "default"}
            className={cn(
              "text-muted-foreground hover:text-gold transition-all duration-300",
              compact ? "h-8 w-8" : "bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 shadow-[0_0_15px_-3px_rgba(212,175,55,0.3)] animate-pulse-gold gap-2 px-4 rounded-full"
            )}
            aria-label="Instalar aplicativo"
          >
            <Download size={compact ? 18 : 20} />
            {!compact && <span className="text-xs font-bold uppercase tracking-wider">Instalar App</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Instalar para uso offline</TooltipContent>
      </Tooltip>
    </div>
  );
}

import { cn } from "@/lib/utils";
