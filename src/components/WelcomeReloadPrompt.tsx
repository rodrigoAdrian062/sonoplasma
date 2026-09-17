import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WELCOME_RELOAD_KEY = 'sonoplasma:welcome-reload';

export function markWelcomeReloadRequired() {
  sessionStorage.setItem(WELCOME_RELOAD_KEY, 'true');
}

export function WelcomeReloadPrompt() {
  const shouldShow = sessionStorage.getItem(WELCOME_RELOAD_KEY) === 'true';
  if (!shouldShow) return null;

  const handleReload = () => {
    sessionStorage.removeItem(WELCOME_RELOAD_KEY);
    window.location.reload();
  };

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gold/40 bg-gold/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-gold">Bem-vindo ao Sonoplasma!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Para conseguir tocar as músicas da biblioteca, atualize a tela uma vez.
        </p>
      </div>
      <Button onClick={handleReload} className="shrink-0 bg-gold text-background hover:bg-gold-glow">
        <RefreshCw size={16} className="mr-2" />
        Atualizar tela (F5)
      </Button>
    </div>
  );
}