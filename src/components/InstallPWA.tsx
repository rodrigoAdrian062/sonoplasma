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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handleInstall}
          variant="ghost"
          size="icon"
          className={`text-muted-foreground hover:text-gold ${compact ? 'h-8 w-8' : ''}`}
          aria-label="Instalar app"
        >
          <Download size={compact ? 18 : 20} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Instalar app</TooltipContent>
    </Tooltip>
  );
}
