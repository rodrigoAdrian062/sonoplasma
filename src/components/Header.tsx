import { useState } from 'react';
import { Sparkles, Plus, Settings, LogOut, Presentation, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsModal } from '@/components/SettingsModal';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HeaderProps {
  onAddStage: () => void;
  onAddSection?: () => void;
  onPresentationMode?: () => void;
  hasStages?: boolean;
}

export function Header({ onAddStage, onAddSection, onPresentationMode, hasStages }: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings } = useSettings();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="w-10 h-10 object-contain rounded-lg"
                />
              ) : (
                <div className="p-2 bg-gold/10 rounded-lg">
                  <Sparkles className="text-gold" size={24} />
                </div>
              )}
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-semibold text-foreground tracking-wide">
                  {settings?.nome_app || 'Sonoplastia Cerimonial'}
                </h1>
                {settings?.subtitulo_app && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {settings.subtitulo_app}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <LogOut size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sair</TooltipContent>
              </Tooltip>
              <Button
                onClick={() => setIsSettingsOpen(true)}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings size={20} />
              </Button>
              {hasStages && onPresentationMode && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onPresentationMode}
                      className="gap-2 bg-secondary hover:bg-gold/20 text-muted-foreground hover:text-gold border border-border hover:border-gold/30"
                      variant="outline"
                      size="sm"
                    >
                      <Presentation size={18} />
                      <span className="hidden sm:inline">Apresentar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Modo Apresentação (Tela Cheia)</TooltipContent>
                </Tooltip>
              )}
              {onAddSection && (
                <Button
                  onClick={onAddSection}
                  className="gap-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 hover:border-gold/50"
                  variant="outline"
                  size="sm"
                >
                  <FolderPlus size={18} />
                  <span className="hidden sm:inline">Nova Seção</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
