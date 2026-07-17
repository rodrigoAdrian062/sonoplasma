import { useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Plus, Volume2, Music2, X, ListMusic, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useBackgroundMusic } from '@/contexts/BackgroundMusicContext';
import { AudioLibraryModal } from '@/components/AudioLibraryModal';
import { cn } from '@/lib/utils';

interface BackgroundMusicPlayerProps {
  variant?: 'header' | 'presentation';
  compact?: boolean;
}

function isPlayableBackgroundAudio(audio: { audio_url: string; tipo?: string | null }) {
  const url = (audio.audio_url || '').toLowerCase();
  const type = (audio.tipo || '').toLowerCase();
  return !(
    type === 'youtube' ||
    type === 'spotify' ||
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('open.spotify.com') ||
    url.startsWith('spotify:')
  );
}

export function BackgroundMusicPlayer({ variant = 'header', compact = false }: BackgroundMusicPlayerProps) {
  const {
    playlist,
    currentTrack,
    currentIndex,
    isPlaying,
    volume,
    autoPauseEnabled,
    wasAutoPaused,
    autoMode,
    duckVolume,
    fadeMs,
    isDucking,
    addTrack,
    removeTrack,
    play,
    toggle,
    next,
    prev,
    setVolume,
    setAutoPauseEnabled,
    setAutoMode,
    setDuckVolume,
    setFadeMs,
    maxDurationSec,
    setMaxDurationSec,
    currentTime,
    duration,
    seek,
  } = useBackgroundMusic();

  const [libOpen, setLibOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isPresentation = variant === 'presentation';

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 rounded-full border-2 backdrop-blur-xl transition-colors shadow-lg shadow-black/40 ring-1 ring-gold/20',
          isPresentation
            ? 'bg-black/70 border-gold/60 text-white px-2 py-1'
            : 'bg-background/85 border-gold/50 text-foreground px-1.5 py-0.5',
          isPlaying && 'border-gold shadow-gold/20',
          compact && 'scale-90'
        )}
        title="Música de fundo"
      >

        <Popover open={expanded} onOpenChange={setExpanded}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors',
                'hover:bg-gold/15',
                isPlaying && 'text-gold'
              )}
              aria-label="Música de fundo"
            >
              <Music2 size={14} className={cn(isPlaying && 'animate-pulse')} />
              {!compact && (
                <span className="text-[11px] font-medium truncate max-w-[110px] hidden sm:inline">
                  {currentTrack?.nome || 'Fundo'}
                </span>
              )}
              <ChevronDown size={11} className="opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side={isPresentation ? 'top' : 'bottom'}
            align="end"
            className="w-80 p-3 space-y-3 bg-background/95 backdrop-blur-md border-gold/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListMusic size={14} className="text-gold" />
                Música de fundo
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs text-gold hover:text-gold hover:bg-gold/10"
                onClick={() => setLibOpen(true)}
              >
                <Plus size={13} />
                Adicionar
              </Button>
            </div>

            {playlist.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma música na fila. Clique em "Adicionar" para escolher da biblioteca.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-0.5 -mx-1">
                {playlist.map((t, i) => (
                  <div
                    key={t.id}
                    className={cn(
                      'group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer',
                      i === currentIndex ? 'bg-gold/10 text-gold' : 'hover:bg-secondary/60'
                    )}
                    onClick={() => play(i)}
                  >
                    <span className="text-[10px] font-mono w-4 text-right opacity-60">{i + 1}</span>
                    <span className="text-xs truncate flex-1">{t.nome}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeTrack(t.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive"
                      aria-label="Remover"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Volume2 size={13} className="text-muted-foreground shrink-0" />
              <Slider
                value={[Math.round(volume * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => setVolume(v / 100)}
                className="flex-1"
              />
              <span className="text-[10px] font-mono w-8 text-right text-muted-foreground">
                {Math.round(volume * 100)}%
              </span>
            </div>

            {/* Max duration cutoff */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Cortar em (min)</span>
                <span className="text-[10px] text-muted-foreground/70">
                  {maxDurationSec > 0 ? `Reinicia após ${(maxDurationSec / 60).toFixed(1)} min` : 'Sem corte (loop completo)'}
                </span>
              </div>
              <input
                type="number"
                min={0}
                step={0.5}
                value={maxDurationSec > 0 ? +(maxDurationSec / 60).toFixed(2) : ''}
                placeholder="0"
                onChange={(e) => {
                  const min = parseFloat(e.target.value);
                  setMaxDurationSec(isNaN(min) || min <= 0 ? 0 : Math.round(min * 60));
                }}
                className="w-16 h-7 rounded-md border border-border/60 bg-background/60 px-2 text-xs text-right"
              />
            </div>

            {/* Auto behavior */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <label className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  Ao iniciar etapa
                  {wasAutoPaused && <span className="ml-1 text-gold/80">(pausado)</span>}
                  {isDucking && <span className="ml-1 text-gold/80">(abaixado)</span>}
                </span>
                <Switch checked={autoPauseEnabled} onCheckedChange={setAutoPauseEnabled} />
              </label>

              {autoPauseEnabled && (
                <>
                  {/* Mode selector */}
                  <div className="flex gap-1 p-0.5 rounded-md bg-secondary/50">
                    <button
                      onClick={() => setAutoMode('pause')}
                      className={cn(
                        'flex-1 text-[10px] py-1 px-2 rounded transition-colors',
                        autoMode === 'pause' ? 'bg-gold/20 text-gold' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Pausar
                    </button>
                    <button
                      onClick={() => setAutoMode('duck')}
                      className={cn(
                        'flex-1 text-[10px] py-1 px-2 rounded transition-colors',
                        autoMode === 'duck' ? 'bg-gold/20 text-gold' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Abaixar volume
                    </button>
                  </div>

                  {/* Duck volume — only in duck mode */}
                  {autoMode === 'duck' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Volume abaixado</span>
                        <span className="font-mono">{Math.round(duckVolume * 100)}%</span>
                      </div>
                      <Slider
                        value={[Math.round(duckVolume * 100)]}
                        min={0}
                        max={80}
                        step={1}
                        onValueChange={([v]) => setDuckVolume(v / 100)}
                      />
                    </div>
                  )}

                </>
              )}
            </div>

          </PopoverContent>
        </Popover>

        {/* Transport controls */}
        {playlist.length > 0 && (
          <>
            <button
              onClick={prev}
              className="p-1 rounded-full hover:bg-gold/15 transition-colors"
              aria-label="Anterior"
              title="Anterior"
            >
              <SkipBack size={12} />
            </button>
            <button
              onClick={toggle}
              className={cn(
                'p-1.5 rounded-full transition-colors',
                isPlaying ? 'bg-gold text-background hover:bg-gold/90' : 'bg-gold/20 text-gold hover:bg-gold/30'
              )}
              aria-label={isPlaying ? 'Pausar' : 'Tocar'}
            >
              {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            </button>
            <button
              onClick={next}
              className="p-1 rounded-full hover:bg-gold/15 transition-colors"
              aria-label="Próxima"
              title="Próxima"
            >
              <SkipForward size={12} />
            </button>
          </>
        )}
      </div>

      <AudioLibraryModal
        isOpen={libOpen}
        onClose={() => setLibOpen(false)}
        selectionMode
        emptySelectionMessage="Nenhum áudio na biblioteca ainda."
        onSelectAudio={(audio) => {
          addTrack({
            id: crypto.randomUUID(),
            nome: audio.nome,
            audio_url: audio.audio_url,
          });
          setLibOpen(false);
        }}
      />
    </>
  );
}
