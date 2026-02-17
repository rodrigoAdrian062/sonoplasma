import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, Settings, LogOut, Presentation, FolderPlus, Library, Box } from 'lucide-react';
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
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings } = useSettings();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container py-2">
          {/* Mobile: Logo centered at top */}
          <div className="flex flex-col items-center gap-3 sm:hidden">
            <div className="flex flex-col items-center gap-2">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="w-12 h-12 object-contain rounded-lg"
                />
              ) : (
                <div className="p-2 bg-gold/10 rounded-lg">
                  <Sparkles className="text-gold" size={28} />
                </div>
              )}
              <div className="text-center">
                <h1 className="font-display text-lg font-semibold text-foreground tracking-wide flex items-center gap-2 justify-center">
                  {settings?.nome_app || 'Sonoplastia Cerimonial'}
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gold/20 text-gold border border-gold/30 px-1.5 py-0.5 rounded-full leading-none">Beta</span>
                </h1>
                {settings?.subtitulo_app && (
                  <p className="text-xs text-muted-foreground">
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
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                  >
                    <LogOut size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sair</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => navigate('/biblioteca')}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-gold h-8 w-8"
                  >
                    <Library size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Biblioteca de Áudios</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => navigate('/templo-3d')}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-gold h-8 w-8"
                  >
                    <Box size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Templo 3D</TooltipContent>
              </Tooltip>
              <Button
                onClick={() => setIsSettingsOpen(true)}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8"
              >
                <Settings size={18} />
              </Button>
              {hasStages && onPresentationMode && (
                <Button
                  onClick={onPresentationMode}
                  className="gap-1 bg-secondary hover:bg-gold/20 text-muted-foreground hover:text-gold border border-border hover:border-gold/30 h-8 px-2"
                  variant="outline"
                  size="sm"
                >
                  <Presentation size={16} />
                </Button>
              )}
              {onAddSection && (
                <Button
                  onClick={onAddSection}
                  className="gap-1 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 hover:border-gold/50 h-8 px-2"
                  variant="outline"
                  size="sm"
                >
                  <FolderPlus size={16} />
                </Button>
              )}
            </div>
          </div>

          {/* Desktop: Original layout */}
          <div className="hidden sm:flex items-center justify-between">
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
                <h1 className="font-display text-2xl font-semibold text-foreground tracking-wide flex items-center gap-2">
                  {settings?.nome_app || 'Sonoplastia Cerimonial'}
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gold/20 text-gold border border-gold/30 px-2 py-0.5 rounded-full leading-none">Beta</span>
                </h1>
                {settings?.subtitulo_app && (
                  <p className="text-sm text-muted-foreground">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => navigate('/biblioteca')}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-gold"
                  >
                    <Library size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Biblioteca de Áudios</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => navigate('/templo-3d')}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-gold"
                  >
                    <Box size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Templo 3D</TooltipContent>
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
