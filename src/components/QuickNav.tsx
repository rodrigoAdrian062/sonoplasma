import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Library, Music2 } from 'lucide-react';
import { YoutubeIcon } from '@/components/icons/YoutubeIcon';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUniversalAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useStages } from '@/hooks/useStages';
import { useAllStageAudios } from '@/hooks/useStageAudios';

const LINKS = [
  { to: '/', label: 'Início', icon: Home, activeClass: 'bg-gold/20 text-gold border-gold/40' },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library, activeClass: 'bg-gold/20 text-gold border-gold/40' },
  { to: '/youtube', label: 'YouTube', icon: YoutubeIcon, activeClass: 'bg-red-500/20 text-red-500 border-red-500/40' },
  { to: '/spotify', label: 'Spotify', icon: SpotifyIcon, activeClass: 'bg-[#1DB954]/20 text-[#1DB954] border-[#1DB954]/40' },
];

export function QuickNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStageId, currentUrl, status } = useUniversalAudioPlayer();
  const { stages } = useStages();
  const { audiosByStageId } = useAllStageAudios();

  // Hide on the auth page
  if (location.pathname === '/auth') return null;

  const links = LINKS;

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

      {currentName && (
        <div
          className="flex items-center gap-1.5 max-w-[9rem] rounded-full bg-gold/15 border border-gold/30 pl-2 pr-3 py-1 ml-0.5"
          aria-label={`Tocando: ${currentName}`}
        >
          <Music2
            size={14}
            className={cn('shrink-0 text-gold', status === 'playing' && 'animate-pulse')}
            aria-hidden="true"
          />
          <span className="text-[11px] font-medium text-gold truncate">{currentName}</span>
        </div>
      )}
    </nav>
  );
}
