import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Library, Music2 } from 'lucide-react';
import { YoutubeIcon } from '@/components/icons/YoutubeIcon';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useStages } from '@/hooks/useStages';
import { useAllStageAudios } from '@/hooks/useStageAudios';
import { useIsPresentationActive } from '@/lib/presentationState';
import { useUiToggles, UiToggleKey } from '@/hooks/useUiToggles';

const LINKS: Array<{ to: string; label: string; icon: any; activeClass: string; toggleKey?: UiToggleKey }> = [
  { to: '/', label: 'Início', icon: Home, activeClass: 'bg-gold/20 text-gold border-gold/40' },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library, activeClass: 'bg-gold/20 text-gold border-gold/40', toggleKey: 'nav_biblioteca' },
  { to: '/youtube', label: 'YouTube', icon: YoutubeIcon, activeClass: 'bg-red-500/20 text-red-500 border-red-500/40', toggleKey: 'nav_youtube' },
  
];



export function QuickNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStageId, currentUrl, status } = useUniversalAudioPlayer();
  const { stages } = useStages();
  const { audiosByStageId } = useAllStageAudios();
  const isPresentation = useIsPresentationActive();
  const { toggles } = useUiToggles();

  // Hide on the auth page
  if (location.pathname === '/auth') return null;

  const links = LINKS.filter((l) => !l.toggleKey || toggles[l.toggleKey]);

  const isPlaying = status === 'playing' || status === 'paused';
  const currentAudio = (audiosByStageId[currentStageId ?? ''] || []).find(
    (a) => a.audio_url === currentUrl
  );
  const currentName = isPlaying
    ? currentAudio?.nome ||
      stages.find((s) => s.id === currentStageId)?.nome_simbolico ||
      'Reproduzindo'
    : null;

  return (
    <nav
      className="fixed bottom-4 left-4 z-[60] flex items-center gap-1 rounded-full border border-border bg-card/95 p-1 shadow-lg shadow-black/20 backdrop-blur-md"
      aria-label="Atalhos rápidos"
    >
      {links.map((link) => {
        const active = link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to);
        return (
          <Tooltip key={link.to}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => navigate(link.to)}
                aria-label={link.label}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border border-transparent transition-all',
                  active
                    ? link.activeClass
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <link.icon size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{link.label}</TooltipContent>
          </Tooltip>
        );
      })}

    </nav>
  );
}
