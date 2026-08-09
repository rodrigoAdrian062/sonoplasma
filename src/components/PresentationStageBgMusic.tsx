import { useState, useEffect } from 'react';
import { BackgroundMusicPlayer } from './BackgroundMusicPlayer';
import { CeremonyStage } from '@/types/ceremony';
import { BackgroundMusicProvider, BackgroundTrack } from '@/contexts/BackgroundMusicContext';
import { supabase } from '@/integrations/supabase/client';

interface PresentationStageBgMusicProps {
  stage: CeremonyStage;
}

/**
 * Renderiza um player de música de fundo isolado que gerencia sua própria playlist
 * salva no campo fundo_musicas da etapa.
 */
export function PresentationStageBgMusic({ stage }: PresentationStageBgMusicProps) {
  const [localPlaylist, setLocalPlaylist] = useState<BackgroundTrack[]>([]);

  useEffect(() => {
    if (stage.fundo_musicas) {
      try {
        const parsed = typeof stage.fundo_musicas === 'string' 
          ? JSON.parse(stage.fundo_musicas) 
          : stage.fundo_musicas;
        setLocalPlaylist(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setLocalPlaylist([]);
      }
    } else {
      setLocalPlaylist([]);
    }
  }, [stage.id, stage.fundo_musicas]);

  const persistPlaylist = async (newPlaylist: BackgroundTrack[]) => {
    setLocalPlaylist(newPlaylist);
    try {
      await supabase
        .from('sonoplastia_etapas')
        .update({ fundo_musicas: newPlaylist as any })
        .eq('id', stage.id);
    } catch (err) {
      console.error('Erro ao salvar playlist da etapa:', err);
    }
  };

  return (
    <BackgroundMusicProvider 
      storageKey={`stage-bg-music-${stage.id}`}
      initialPlaylist={localPlaylist}
      onPlaylistChange={persistPlaylist}
    >
      <div className="flex items-center gap-2">
        <BackgroundMusicPlayer variant="presentation" compact />
      </div>
    </BackgroundMusicProvider>
  );
}
