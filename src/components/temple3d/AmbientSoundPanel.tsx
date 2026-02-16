import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Music, ChevronDown, ChevronUp, Pause, Play, Repeat } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useAudioFolders } from '@/hooks/useAudioFolders';

interface AmbientSoundPanelProps {
  className?: string;
}

export function AmbientSoundPanel({ className }: AmbientSoundPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string | null>(null);
  const [selectedAudioName, setSelectedAudioName] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { audios } = useAudioLibrary();
  const { folders } = useAudioFolders();

  // Filter non-YouTube audios (only playable files)
  const isYouTubeUrl = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');
  
  const filteredAudios = audios.filter(a => {
    if (isYouTubeUrl(a.audio_url)) return false;
    if (selectedFolderId === null) return true;
    if (selectedFolderId === '__root__') return !a.pasta_id;
    return a.pasta_id === selectedFolderId;
  });

  const handlePlay = useCallback((url: string, name: string) => {
    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (selectedAudioUrl === url && isPlaying) {
      setIsPlaying(false);
      setSelectedAudioUrl(null);
      setSelectedAudioName('');
      return;
    }

    const audio = new Audio(url);
    audio.volume = volume;
    audio.loop = true;
    audio.play().catch(() => {});
    audioRef.current = audio;
    setSelectedAudioUrl(url);
    setSelectedAudioName(name);
    setIsPlaying(true);

    audio.onended = () => {
      // loop handles this, but just in case
      setIsPlaying(false);
    };
  }, [selectedAudioUrl, isPlaying, volume]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Update volume on audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const isMuted = volume === 0;

  return (
    <div className={`absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border border-primary/20 overflow-hidden ${className}`}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-accent/50 transition-colors"
      >
        <Music className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-foreground flex-1">
          {isPlaying ? `♫ ${selectedAudioName}` : 'Som Ambiente'}
        </span>
        {isPlaying && (
          <span className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="inline-block w-0.5 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${8 + Math.random() * 8}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </span>
        )}
        {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronUp className="h-3 w-3 text-muted-foreground" />}
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 max-w-[260px]">
          {/* Volume control */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVolume(isMuted ? 0.4 : 0)}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <Slider
              value={[volume * 100]}
              onValueChange={(v) => setVolume(v[0] / 100)}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round(volume * 100)}%</span>
          </div>

          {/* Play/pause for current track */}
          {selectedAudioUrl && (
            <div className="flex items-center gap-2 bg-accent/30 rounded px-2 py-1">
              <button onClick={togglePlayPause} className="text-primary hover:text-primary/80">
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <span className="text-[10px] text-foreground truncate flex-1">{selectedAudioName}</span>
              <Repeat className="h-3 w-3 text-primary/60" />
            </div>
          )}

          {/* Folder filter */}
          {folders.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`text-[10px] px-1.5 py-0.5 rounded ${selectedFolderId === null ? 'bg-primary text-primary-foreground' : 'bg-accent/50 text-muted-foreground'}`}
              >
                Todos
              </button>
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`text-[10px] px-1.5 py-0.5 rounded truncate max-w-[80px] ${selectedFolderId === f.id ? 'bg-primary text-primary-foreground' : 'bg-accent/50 text-muted-foreground'}`}
                >
                  {f.nome}
                </button>
              ))}
            </div>
          )}

          {/* Audio list */}
          <div className="max-h-[150px] overflow-y-auto space-y-0.5 scrollbar-thin">
            {filteredAudios.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-2">
                Nenhum áudio na biblioteca
              </p>
            ) : (
              filteredAudios.map(audio => (
                <button
                  key={audio.id}
                  onClick={() => handlePlay(audio.audio_url, audio.nome)}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] truncate transition-colors ${
                    selectedAudioUrl === audio.audio_url
                      ? 'bg-primary/20 text-primary font-medium'
                      : 'text-foreground hover:bg-accent/50'
                  }`}
                >
                  {selectedAudioUrl === audio.audio_url && isPlaying ? '♫ ' : '♪ '}
                  {audio.nome}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
