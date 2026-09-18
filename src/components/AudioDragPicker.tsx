import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Search, Music, Play, Pause, Square, Plus, Upload, Loader2,
  Link as LinkIcon, X, Folder, ChevronLeft, Library, GripVertical, MousePointerClick, Check, Trash2, Wand2, Youtube,

} from 'lucide-react';
import { YoutubeAiSuggestionsModal } from '@/components/YoutubeAiSuggestionsModal';

import { YoutubeIcon } from '@/components/icons/YoutubeIcon';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';
import { FolderMusicIcon } from '@/components/icons/FolderMusicIcon';

import { matchAudiosForStage } from '@/lib/autoMatchAudios';
import type { CeremonyStage } from '@/types/ceremony';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useAudioFolders } from '@/hooks/useAudioFolders';
import { useUserAccess } from '@/hooks/useUserAccess';
import { hasPermission } from '@/lib/access';
import { supabase } from '@/integrations/supabase/client';
import {
  destroySpotifyPlayer,
  pauseSpotifyEntity,
  playSpotifyEntity,
  resumeSpotifyEntity,
  seekSpotifyEntity,
  subscribeSpotifyPlayback,
} from '@/lib/spotifyIframePlayer';

interface AudioItem {
  nome: string;
  audio_url: string;
}

interface AudioDragPickerProps {
  isOpen: boolean;
  onClose: () => void;
  audios: AudioItem[];
  onChange: (audios: AudioItem[]) => void;
  maxAudios?: number;
  stageTitle?: string;
  stageDescription?: string;
}

type AddMode = 'upload' | 'youtube' | 'spotify' | 'link';

const isYouTubeUrl = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');
const isSpotifyUrl = (url: string) => url.includes('open.spotify.com') || url.startsWith('spotify:');

const getYouTubeVideoId = (url: string): string | null => {
  const m = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2].length === 11 ? m[2] : null;
};

// Ready-made preview hints. Common presets always shown; theme-specific ones
// appear first when the stage title matches related keywords.
type HintPreset = { label: string; text: string; keywords?: string[] };
const HINT_PRESETS: HintPreset[] = [
  { label: 'Abertura solene', text: 'Momento de abertura solene e reverente. Música sacra/instrumental, sem letra, ritmo lento, atmosfera de recolhimento e respeito.', keywords: ['abertura', 'iniciar', 'início'] },
  { label: 'Livro da Lei / Bíblia', text: 'Abertura do Livro da Lei — música sacra, delicada, de adoração e conexão com o Grande Arquiteto. Instrumental suave (piano/cordas), sem letra.', keywords: ['livro da lei', 'bíblia', 'biblia', 'volume da lei'] },
  { label: 'Entrada de dignitários', text: 'Entrada solene de dignitários/autoridades. Música majestosa, marcial, instrumental orquestral, digna e imponente.', keywords: ['entrada', 'dignitário', 'autoridade', 'venerável'] },
  { label: 'Cadeia de União', text: 'Cadeia de União — música fraternal, emotiva, que remeta a irmandade e comunhão. Melodia envolvente, pode ter coro suave.', keywords: ['cadeia', 'união', 'fraternidade'] },
  { label: 'Iniciação / Elevação', text: 'Momento iniciático — música misteriosa, introspectiva, com tensão suave. Instrumental, tons graves, evolução gradual até luz.', keywords: ['iniciação', 'iniciacao', 'elevação', 'elevacao', 'exaltação', 'exaltacao', 'aprendiz', 'companheiro', 'mestre'] },
  { label: 'Reflexão / Meditação', text: 'Momento de reflexão e meditação. Música instrumental muito calma, ambiente, sem picos, para introspecção.', keywords: ['reflexão', 'reflexao', 'meditação', 'meditacao', 'silêncio', 'silencio'] },
  { label: 'Luto / Fúnebre', text: 'Homenagem fúnebre — música solene, reflexiva, adágio, cordas graves. Respeitosa e emocionante, sem excesso dramático.', keywords: ['luto', 'fúnebre', 'funebre', 'necrológio', 'necrologio', 'memória', 'memoria', 'homenagem póstuma'] },
  { label: 'Votação / Escrutínio', text: 'Momento de votação/escrutínio — música neutra e discreta de fundo, instrumental leve, sem distrair.', keywords: ['votação', 'votacao', 'escrutínio', 'escrutinio', 'bolas'] },
  { label: 'Encerramento', text: 'Encerramento dos trabalhos — música serena e conclusiva, sensação de dever cumprido, instrumental esperançoso.', keywords: ['encerramento', 'fechamento', 'final', 'saída', 'saida'] },
  { label: 'Hino / Cívico', text: 'Hino ou momento cívico — versão instrumental respeitosa, ritmo firme e digno.', keywords: ['hino', 'cívico', 'civico', 'bandeira', 'pátria', 'patria'] },
  { label: 'Ágape / Confraternização', text: 'Ágape/confraternização — música leve e alegre, ambiente agradável, pode ter voz suave, sem euforia.', keywords: ['ágape', 'agape', 'confraterniza', 'jantar', 'brinde'] },
];

function getHintPresets(stageTitle: string): HintPreset[] {
  const t = (stageTitle || '').toLowerCase();
  const matches: HintPreset[] = [];
  const rest: HintPreset[] = [];
  for (const p of HINT_PRESETS) {
    if (p.keywords?.some((k) => t.includes(k))) matches.push(p);
    else rest.push(p);
  }
  return [...matches, ...rest];
}



function SourceIcon({ url, size = 14 }: { url: string; size?: number }) {
  if (isYouTubeUrl(url)) return <YoutubeIcon size={size} />;
  if (isSpotifyUrl(url)) return <SpotifyIcon size={size} className="text-[#1DB954]" />;
  return <FolderMusicIcon size={size} />;
}


export function AudioDragPicker({ isOpen, onClose, audios, onChange, maxAudios = Infinity, stageTitle, stageDescription }: AudioDragPickerProps) {
  const { audios: library, isLoading, uploadAndAddAudio, addAudio, deleteAudio } = useAudioLibrary();
  const { folders } = useAudioFolders();
  const { access } = useUserAccess();
  const canUseAI = hasPermission(access, 'canUseAI');

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'upload' | 'youtube' | 'spotify'>('all');
  const [suggestMode, setSuggestMode] = useState(false);
  const [aiSuggested, setAiSuggested] = useState<AudioItem[] | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiHint, setAiHint] = useState('');
  const [aiHintDraft, setAiHintDraft] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytPollRef = useRef<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingUrl, setDraggingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!playingUrl || !isSpotifyUrl(playingUrl)) return;
    return subscribeSpotifyPlayback((data) => {
      if (typeof data.position === 'number') setCurTime(data.position / 1000);
      if (typeof data.duration === 'number' && data.duration > 0) setDuration(data.duration / 1000);
      if (typeof data.isPaused === 'boolean') setIsPaused(data.isPaused);
    });
  }, [playingUrl]);

  const [showAdd, setShowAdd] = useState(false);
  const [showYtAi, setShowYtAi] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('upload');
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedUrls = useMemo(() => new Set(audios.map((a) => a.audio_url)), [audios]);
  const atMax = audios.length >= maxAudios;

  const matchesSource = (url: string) => {
    if (sourceFilter === 'all') return true;
    if (sourceFilter === 'youtube') return isYouTubeUrl(url);
    if (sourceFilter === 'spotify') return isSpotifyUrl(url);
    return !isYouTubeUrl(url) && !isSpotifyUrl(url); // upload/link
  };

  const suggested = useMemo(() => {
    if (!suggestMode || !stageTitle) return null;
    if (aiSuggested && aiSuggested.length > 0) {
      // preserve order returned by AI; intersect with current library
      const byUrl = new Map(library.map((a) => [a.audio_url, a] as const));
      const ordered = aiSuggested
        .map((a) => byUrl.get(a.audio_url))
        .filter((a): a is typeof library[number] => Boolean(a));
      if (ordered.length > 0) return ordered;
    }
    // fallback local matcher while AI loads or if AI returned nothing
    const fakeStage = {
      id: 'sug',
      nome_simbolico: stageTitle,
      descricao: stageDescription || '',
    } as unknown as CeremonyStage;
    const results = matchAudiosForStage(fakeStage, library, 50);
    return results.map((r) => r.audio);
  }, [suggestMode, stageTitle, stageDescription, library, aiSuggested]);

  // Trigger AI suggestion when entering suggest mode
  useEffect(() => {
    if (!suggestMode || !stageTitle || library.length === 0) return;
    let cancelled = false;
    (async () => {
      setIsSuggesting(true);
      try {
        const payload = {
          stageTitle,
          stageDescription: stageDescription || '',
          userHint: aiHint || '',
          limit: 50,
          library: library.map((a) => ({ nome: a.nome, audio_url: a.audio_url })),
        };
        const { data, error } = await supabase.functions.invoke('suggest-audios', { body: payload });
        if (cancelled) return;
        if (error) {
          toast.error('IA indisponível — usando sugestão local');
          setAiSuggested(null);
          return;
        }
        const indices: number[] = Array.isArray(data?.indices) ? data.indices : [];
        const picked = indices
          .map((i) => library[i])
          .filter(Boolean)
          .map((a) => ({ nome: a.nome, audio_url: a.audio_url }));
        setAiSuggested(picked);
        if (picked.length === 0) toast.info('IA não encontrou músicas ideais — mostrando por semelhança de título');
      } catch {
        if (!cancelled) toast.error('Erro ao consultar IA');
      } finally {
        if (!cancelled) setIsSuggesting(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestMode, stageTitle, stageDescription, aiHint]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = suggested ?? library;
    return base.filter((a) => {
      // Mantém áudios já selecionados visíveis com estado "Em uso" (não selecionáveis)
      const scoped = suggested || search || sourceFilter !== 'all' ? true : (a as any).pasta_id === currentFolderId;
      const matches = !q || a.nome.toLowerCase().includes(q);
      return scoped && matches && matchesSource(a.audio_url);
    });
  }, [library, suggested, search, currentFolderId, sourceFilter]);

  const [isAutoPicking, setIsAutoPicking] = useState(false);
  const autoPickSix = async () => {
    if (!canUseAI) {
      toast.error('Este recurso é exclusivo do plano Premium');
      return;
    }
    if (!stageTitle) return;
    if (atMax) { toast.info('Etapa já está no máximo de áudios'); return; }
    setIsAutoPicking(true);
    try {
      const available = library.filter((a) => !selectedUrls.has(a.audio_url));
      if (available.length === 0) { toast.info('Biblioteca sem áudios disponíveis'); return; }

      // 3 por semelhança de nome (matcher local)
      const fakeStage = { id: 'auto', nome_simbolico: stageTitle, descricao: stageDescription || '' } as unknown as CeremonyStage;
      const byName = matchAudiosForStage(fakeStage, available, 3).map((r) => r.audio);
      const usedUrls = new Set(byName.map((a) => a.audio_url));

      // 3 pela IA (excluindo os já escolhidos por nome)
      let byAI: typeof library = [];
      try {
        const remaining = available.filter((a) => !usedUrls.has(a.audio_url));
        const { data, error } = await supabase.functions.invoke('suggest-audios', {
          body: {
            stageTitle,
            stageDescription: stageDescription || '',
            userHint: aiHint || aiHintDraft || '',
            limit: 3,
            library: remaining.map((a) => ({ nome: a.nome, audio_url: a.audio_url })),
          },
        });
        if (!error) {
          const indices: number[] = Array.isArray(data?.indices) ? data.indices : [];
          byAI = indices.map((i) => remaining[i]).filter(Boolean).slice(0, 3);
        }
      } catch { /* fallback abaixo */ }

      // Fallback: completa com matcher local se IA não trouxe 3
      if (byAI.length < 3) {
        const need = 3 - byAI.length;
        const filler = matchAudiosForStage(fakeStage,
          available.filter((a) => !usedUrls.has(a.audio_url) && !byAI.some((b) => b.audio_url === a.audio_url)),
          need
        ).map((r) => r.audio);
        byAI = [...byAI, ...filler];
      }

      const picks = [...byName, ...byAI]
        .filter((a) => a && !selectedUrls.has(a.audio_url))
        .slice(0, Math.max(0, maxAudios - audios.length));

      if (picks.length === 0) { toast.info('Nada novo a adicionar'); return; }
      onChange([...audios, ...picks.map((a) => ({ nome: a.nome, audio_url: a.audio_url }))]);
      toast.success(`${picks.length} áudio(s) adicionado(s) — ${byName.length} por nome + ${picks.length - byName.length} pela IA`);
    } finally {
      setIsAutoPicking(false);
    }
  };

  const [isAutoPickingAll, setIsAutoPickingAll] = useState(false);
  const autoPickAllYtSp = async () => {
    if (!canUseAI) {
      toast.error('Este recurso é exclusivo do plano Premium');
      return;
    }
    if (!stageTitle) return;
    if (atMax) { toast.info('Etapa já está no máximo de áudios'); return; }
    setIsAutoPickingAll(true);
    try {
      // Todo o catálogo YouTube + Spotify (todas as pastas), excluindo os já selecionados
      const pool = library.filter((a) =>
        (isYouTubeUrl(a.audio_url) || isSpotifyUrl(a.audio_url)) &&
        !selectedUrls.has(a.audio_url)
      );
      if (pool.length === 0) { toast.info('Nenhum áudio de YouTube/Spotify disponível'); return; }

      const remainingSlots = Math.max(0, maxAudios - audios.length);
      const askLimit = Math.min(50, Number.isFinite(remainingSlots) ? remainingSlots : 50);

      const { data, error } = await supabase.functions.invoke('suggest-audios', {
        body: {
          stageTitle,
          stageDescription: stageDescription || '',
          userHint: aiHint || aiHintDraft || '',
          limit: askLimit,
          library: pool.map((a) => ({ nome: a.nome, audio_url: a.audio_url })),
        },
      });
      if (error) { toast.error('IA indisponível no momento'); return; }

      const indices: number[] = Array.isArray(data?.indices) ? data.indices : [];
      const picks = indices
        .map((i) => pool[i])
        .filter((a): a is typeof library[number] => Boolean(a) && !selectedUrls.has(a.audio_url))
        .slice(0, remainingSlots);

      if (picks.length === 0) { toast.info('A IA não retornou sugestões desta vez'); return; }
      onChange([...audios, ...picks.map((a) => ({ nome: a.nome, audio_url: a.audio_url }))]);
      toast.success(`${picks.length} áudio(s) do YouTube/Spotify adicionados pela IA`);
    } finally {
      setIsAutoPickingAll(false);
    }
  };


  const formatTime = (s: number) => {
    if (!Number.isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const stopPreview = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (ytPollRef.current) { clearInterval(ytPollRef.current); ytPollRef.current = null; }
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.stopVideo?.(); ytPlayerRef.current.destroy?.(); } catch { /* noop */ }
      ytPlayerRef.current = null;
    }
    destroySpotifyPlayer();
    setPlayingUrl(null);
    setIsPaused(false);
    setCurTime(0);
    setDuration(0);
  };

  const playYouTube = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) { toast.error('URL do YouTube inválida'); return; }
    stopPreview();

    let container = document.getElementById('yt-picker-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-picker-player-container';
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(container);
    }
    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-picker-player';
    container.innerHTML = '';
    container.appendChild(playerDiv);

    const initPlayer = () => {
      if (!(window as any).YT || !(window as any).YT.Player) {
        setTimeout(initPlayer, 100);
        return;
      }
      ytPlayerRef.current = new (window as any).YT.Player('yt-picker-player', {
        height: '1',
        width: '1',
        videoId,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: (e: any) => {
            e.target.setVolume(70);
            e.target.playVideo();
            setPlayingUrl(url);
            setIsPaused(false);
            ytPollRef.current = setInterval(() => {
              try {
                setCurTime(ytPlayerRef.current?.getCurrentTime?.() || 0);
                setDuration(ytPlayerRef.current?.getDuration?.() || 0);
              } catch { /* noop */ }
            }, 500);
          },
          onStateChange: (e: any) => {
            const YT = (window as any).YT;
            if (e.data === YT.PlayerState.ENDED) stopPreview();
          },
          onError: () => { toast.error('Erro ao reproduzir vídeo'); stopPreview(); },
        },
      });
    };

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.getElementsByTagName('script')[0]?.parentNode?.insertBefore(tag, document.getElementsByTagName('script')[0]);
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }
  };

  const togglePreview = (url: string) => {
    // Spotify: toca pelo player invisível e mantém apenas o controle do sistema visível.
    if (isSpotifyUrl(url)) {
      if (playingUrl === url && !isPaused) {
        pauseSpotifyEntity().then(() => setIsPaused(true)).catch(() => toast.error('Erro ao pausar Spotify'));
        return;
      }
      if (playingUrl === url && isPaused) {
        resumeSpotifyEntity(url).then(() => setIsPaused(false)).catch(() => toast.error('Erro ao retomar Spotify'));
        return;
      }
      stopPreview();
      playSpotifyEntity(url).then(() => {
        setPlayingUrl(url);
        setIsPaused(false);
        setCurTime(0);
        setDuration(0);
      }).catch(() => toast.error('Erro ao tocar Spotify'));
      return;
    }


    // YouTube: toggle pause/resume via IFrame API (inline, no new tab)
    if (isYouTubeUrl(url)) {
      if (playingUrl === url && ytPlayerRef.current) {
        try {
          if (isPaused) { ytPlayerRef.current.playVideo(); setIsPaused(false); }
          else { ytPlayerRef.current.pauseVideo(); setIsPaused(true); }
        } catch { /* noop */ }
        return;
      }
      playYouTube(url);
      return;
    }

    // Same audio: toggle pause/resume
    if (playingUrl === url && audioRef.current) {
      if (isPaused) {
        audioRef.current.play();
        setIsPaused(false);
      } else {
        audioRef.current.pause();
        setIsPaused(true);
      }
      return;
    }
    stopPreview();
    const el = new Audio(url);
    audioRef.current = el;
    el.onloadedmetadata = () => setDuration(el.duration);
    el.ontimeupdate = () => setCurTime(el.currentTime);
    el.onended = () => stopPreview();
    el.play().then(() => { setPlayingUrl(url); setIsPaused(false); }).catch(() => toast.error('Erro ao tocar áudio'));
  };

  const seekTo = (url: string, ratio: number) => {
    if (playingUrl !== url || duration <= 0) return;
    if (isYouTubeUrl(url) && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(ratio * duration, true); } catch { /* noop */ }
    } else if (isSpotifyUrl(url)) {
      seekSpotifyEntity(ratio * duration).catch(() => { /* noop */ });
    } else if (audioRef.current) {
      audioRef.current.currentTime = ratio * duration;
    }
  };

  const handleDeleteFromLibrary = (item: { id: string; audio_url: string }) => {
    if (!window.confirm('Excluir este áudio da biblioteca? Esta ação não pode ser desfeita.')) return;
    if (playingUrl === item.audio_url) stopPreview();
    // also remove it from the current stage selection if present
    if (selectedUrls.has(item.audio_url)) {
      onChange(audios.filter((a) => a.audio_url !== item.audio_url));
    }
    deleteAudio.mutate(item.id);
  };




  // Stop playback when the dialog closes / unmounts
  useEffect(() => {
    if (!isOpen) stopPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    return () => stopPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const addItem = (item: AudioItem) => {
    if (selectedUrls.has(item.audio_url)) return;
    if (atMax) {
      toast.error(`Máximo de ${maxAudios} áudios`);
      return;
    }
    onChange([...audios, { nome: item.nome, audio_url: item.audio_url }]);
  };

  const removeItem = (url: string) => onChange(audios.filter((a) => a.audio_url !== url));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) addItem(JSON.parse(data));
    } catch {
      /* ignore */
    }
    setDraggingUrl(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const name = files.length === 1 && newName ? newName : file.name.replace(/\.[^/.]+$/, '');
        try {
          const res: any = await uploadAndAddAudio(file, name);
          if (!atMax && res?.audio_url) onChange([...audios, { nome: res.nome, audio_url: res.audio_url }]);
        } catch {
          /* handled in hook */
        }
      }
      setNewName('');
      setShowAdd(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!newUrl.trim() || !newName.trim()) {
      toast.error('Preencha nome e link');
      return;
    }
    const tipo = isYouTubeUrl(newUrl) ? 'youtube' : isSpotifyUrl(newUrl) ? 'spotify' : 'external';
    try {
      await addAudio.mutateAsync({ nome: newName.trim(), audio_url: newUrl.trim(), tipo });
      if (!atMax) onChange([...audios, { nome: newName.trim(), audio_url: newUrl.trim() }]);
      setNewName('');
      setNewUrl('');
      setShowAdd(false);
    } catch {
      /* handled in hook */
    }
  };

  const currentFolder = folders.find((f) => f.id === currentFolderId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-[100dvh] sm:h-screen rounded-none border-0 flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base flex-wrap">
            <Library className="text-gold" size={18} />
            Escolher áudios
            <span className="ml-1 text-xs font-normal text-muted-foreground hidden sm:flex items-center gap-1">
              <GripVertical size={12} /> arraste da biblioteca para a lista
            </span>
            {stageTitle && (
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                {canUseAI && (
                  <>
                    <button
                      type="button"
                      onClick={autoPickSix}
                      disabled={isAutoPicking || atMax}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all',
                        'border-gold/60 bg-gold text-background hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      title="A IA escolhe 6 áudios: 3 pelo nome + 3 pela análise da etapa"
                    >
                      {isAutoPicking ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      {isAutoPicking ? 'Selecionando...' : 'IA escolher 6 áudios'}
                    </button>
                    <button
                      type="button"
                      onClick={autoPickAllYtSp}
                      disabled={isAutoPickingAll || atMax}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all',
                        'border-[#1DB954]/60 bg-gradient-to-r from-red-500/90 to-[#1DB954]/90 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      title="A IA seleciona TODAS as músicas relevantes do YouTube + Spotify de todas as pastas"
                    >
                      {isAutoPickingAll ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      {isAutoPickingAll ? 'Analisando YT + Spotify...' : 'IA: todas do YouTube + Spotify'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowYtAi(true)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all',
                        'border-red-500/60 bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      )}
                      title="A IA sugere músicas instrumentais reais do YouTube para esta etapa"
                    >
                      <Youtube size={12} />
                      Sugerir do YouTube (IA)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestMode((v) => !v)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all',
                        suggestMode
                          ? 'border-gold/60 bg-gold/15 text-gold shadow-sm shadow-gold/20'
                          : 'border-border bg-secondary text-muted-foreground hover:text-gold hover:border-gold/40'
                      )}
                      title={`Sugere músicas conforme "${stageTitle}"`}
                    >
                      {isSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      {isSuggesting ? 'IA analisando...' : suggestMode ? 'Sugestões IA ativas' : 'Sugerir com IA'}
                    </button>
                  </>
                )}
                {!canUseAI && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-muted-foreground/30 bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                    <Wand2 size={12} />
                    Premium para usar IA
                  </span>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {stageTitle && (
          <YoutubeAiSuggestionsModal
            isOpen={showYtAi}
            onClose={() => setShowYtAi(false)}
            stageTitle={stageTitle}
            stageDescription={stageDescription}
            onAddToStage={(item) => {
              if (audios.length >= maxAudios) { toast.info('Etapa cheia'); return; }
              if (audios.some((a) => a.audio_url === item.audio_url)) { toast.info('Já está na etapa'); return; }
              onChange([...audios, item]);
            }}
          />
        )}

        {suggestMode && stageTitle && (
          <div className="px-4 py-3 border-b border-border bg-gold/5 space-y-2">
            <label className="text-xs font-medium text-gold flex items-center gap-1.5">
              <Wand2 size={12} />
              Descreva a etapa para a IA (opcional — quanto mais detalhe, melhor a sugestão)
            </label>

            {/* Preset chips — click to load a ready-made hint, then edit if needed */}
            <div className="flex flex-wrap gap-1.5">
              {getHintPresets(stageTitle).map((p) => {
                const active = aiHintDraft.trim() === p.text.trim();
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setAiHintDraft(p.text)}
                    title={p.text}
                    className={cn(
                      'text-[11px] rounded-full border px-2.5 py-1 transition-all',
                      active
                        ? 'border-gold/60 bg-gold/15 text-gold'
                        : 'border-border bg-secondary text-muted-foreground hover:text-gold hover:border-gold/40'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={aiHintDraft}
              onChange={(e) => setAiHintDraft(e.target.value)}
              placeholder={`Ex: "${stageTitle}" — momento solene de abertura, música sacra/adoração, sem letra, ritmo lento...`}
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-gold"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                {aiHint ? 'Prévia aplicada — a IA reordena as sugestões.' : 'Escolha um exemplo acima ou escreva a sua prévia.'}
              </span>
              <div className="flex items-center gap-2">
                {aiHint && (
                  <button
                    type="button"
                    onClick={() => { setAiHint(''); setAiHintDraft(''); }}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Limpar
                  </button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAiHint(aiHintDraft.trim())}
                  disabled={isSuggesting || aiHintDraft.trim() === aiHint}
                  className="h-7 bg-gold hover:bg-gold/90 text-background text-xs gap-1.5"
                >
                  {isSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  Aplicar prévia
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_380px] overflow-hidden">
          {/* Library side */}
          <div className="flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-border">
            <div className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar na biblioteca..."
                  className="bg-secondary border-border pl-9 h-9 text-sm"
                />
              </div>

              {/* Source filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: 'all', label: 'Todos', icon: Library },
                  { id: 'upload', label: 'Áudio', icon: Music },
                  { id: 'youtube', label: 'YouTube', icon: YoutubeIcon },
                ] as const).map((f) => {
                  const active = sourceFilter === f.id;
                  const count = f.id === 'all'
                    ? library.length
                    : library.filter((a) => (
                        f.id === 'youtube' ? isYouTubeUrl(a.audio_url)
                        : !isYouTubeUrl(a.audio_url)
                      )).length;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSourceFilter(f.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all',
                        active
                          ? f.id === 'youtube'
                            ? 'border-red-500/50 bg-red-500/15 text-red-500'
                            : 'border-gold/50 bg-gold/15 text-gold'
                          : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <f.icon size={12} />
                      {f.label}
                      <span className="opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>



              {!search && currentFolderId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFolderId(null)}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  <ChevronLeft size={14} className="mr-1" />
                  {currentFolder?.nome || 'Voltar'}
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 px-3 pb-3">
              {!search && sourceFilter === 'all' && !currentFolderId && folders.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-card"
                    >
                      <div className="rounded-lg bg-primary/10 p-1.5">
                        <Folder size={15} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{folder.nome}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {library.filter((a) => (a as any).pasta_id === folder.id).length} áudio(s)
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-gold" size={22} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
                  <Library size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">{search ? 'Nenhum áudio encontrado' : currentFolderId ? 'Pasta vazia' : 'Biblioteca vazia'}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filtered.map((item) => {
                    const selected = selectedUrls.has(item.audio_url);
                    return (
                      <div
                        key={item.id}
                        draggable={!selected}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({ nome: item.nome, audio_url: item.audio_url }));
                          e.dataTransfer.effectAllowed = 'copy';
                          setDraggingUrl(item.audio_url);
                        }}
                        onDragEnd={() => setDraggingUrl(null)}
                        className={cn(
                          'rounded-lg border p-2 transition-all',
                          selected
                            ? 'border-gold/40 bg-gold/5 opacity-60'
                            : 'border-border/50 bg-card/50 hover:border-gold/40 hover:bg-card cursor-grab active:cursor-grabbing',
                          draggingUrl === item.audio_url && 'opacity-40'
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          {!selected && <GripVertical size={14} className="text-muted-foreground shrink-0" />}
                          <div className="rounded-md bg-secondary p-1.5 shrink-0">
                            <SourceIcon url={item.audio_url} />
                          </div>
                          <span className="flex-1 basis-32 min-w-0 truncate text-sm text-foreground">{item.nome}</span>
                          <div className="flex items-center gap-1 shrink-0 ml-auto">
                            <button
                              type="button"
                              onClick={() => togglePreview(item.audio_url)}
                              className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500 text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                              title="Ouvir"
                            >
                              {playingUrl === item.audio_url && !isPaused ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
                            </button>
                            {playingUrl === item.audio_url && (
                              <button
                                type="button"
                                onClick={() => stopPreview()}
                                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Parar"
                              >
                                <Square size={14} />
                              </button>
                            )}
                            {selected ? (
                              <span className="shrink-0 inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] font-medium text-gold" title="Já em uso nesta etapa">
                                <Check size={11} /> Em uso
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addItem(item)}
                                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-gold hover:bg-gold/10"
                                title="Adicionar"
                              >
                                <Plus size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteFromLibrary(item)}
                              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Excluir da biblioteca"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>


                        {/* Progress bar (same model as library) */}
                        {playingUrl === item.audio_url && duration > 0 && (
                          <div className="mt-2 flex items-center gap-2 px-1">
                            <span className="w-9 text-right font-mono text-[10px] text-muted-foreground">
                              {formatTime(curTime)}
                            </span>
                            <div
                              className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-secondary"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                seekTo(item.audio_url, (e.clientX - rect.left) / rect.width);
                              }}
                            >
                              <div
                                className="relative h-full rounded-full bg-gold transition-all"
                                style={{ width: `${(curTime / duration) * 100}%` }}
                              >
                                <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-gold opacity-0 shadow-lg transition-opacity group-hover:opacity-100" />
                              </div>
                            </div>
                            <span className="w-9 font-mono text-[10px] text-muted-foreground">
                              {formatTime(duration)}
                            </span>
                          </div>
                        )}

                      </div>


                    );
                  })}
                </div>
              )}

              {/* Add new */}
              <div className="mt-2">
                {!showAdd ? (
                  <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gold/40 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/10"
                  >
                    <Plus size={14} />
                    Adicionar novo áudio
                  </button>
                ) : (
                  <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
                    <div className="flex gap-1 rounded-lg bg-secondary p-1">
                      {([
                        { id: 'upload', label: 'Upload', icon: Upload },
                        { id: 'youtube', label: 'YouTube', icon: YoutubeIcon },
                        
                        { id: 'link', label: 'Link', icon: LinkIcon },
                      ] as const).map((t) => (

                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAddMode(t.id)}
                          className={cn(
                            'flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs transition-all',
                            addMode === t.id ? 'bg-gold/20 font-medium text-gold' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <t.icon size={12} />
                          <span className="hidden sm:inline">{t.label}</span>
                        </button>
                      ))}
                    </div>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome do áudio"
                      className="bg-secondary border-border h-9 text-sm"
                    />
                    {addMode === 'upload' ? (
                      <>
                        <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileSelect} className="hidden" />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full gap-2 border-gold/30 text-gold hover:bg-gold/10"
                        >
                          {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                          {isUploading ? 'Enviando...' : 'Selecionar arquivo(s)'}
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          placeholder={
                            addMode === 'youtube' ? 'https://youtube.com/watch?v=...'
                            : addMode === 'spotify' ? 'https://open.spotify.com/track/...'
                            : 'https://...'
                          }
                          className="bg-secondary border-border h-9 text-sm flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleAddUrl}
                          disabled={addAudio.isPending}
                          className="bg-gold hover:bg-gold-glow text-background"
                        >
                          {addAudio.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Ok'}
                        </Button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setShowAdd(false); setNewName(''); setNewUrl(''); }}
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Drop zone side */}
          <div className="flex flex-col overflow-hidden bg-secondary/20">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-xs font-medium text-foreground">
                Áudios da etapa ({audios.length}{Number.isFinite(maxAudios) ? `/${maxAudios}` : ''})
              </span>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'flex-1 overflow-y-auto p-3 transition-colors',
                isDragOver && 'bg-gold/10 ring-2 ring-inset ring-gold/50'
              )}
            >
              {audios.length === 0 ? (
                <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center text-muted-foreground">
                  <MousePointerClick size={30} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">Arraste as músicas para cá</p>
                  <p className="text-xs mt-0.5">ou toque no + na biblioteca</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {audios.map((a) => (
                    <div
                      key={a.audio_url}
                      className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 p-2 min-w-0"
                    >
                      <div className="rounded-md bg-secondary p-1.5 shrink-0">
                        <SourceIcon url={a.audio_url} />
                      </div>
                      <span className="flex-1 min-w-0 truncate text-sm text-foreground">{a.nome || 'Áudio'}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(a.audio_url)}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remover"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-border p-3">
              <Button type="button" onClick={onClose} className="w-full bg-gold hover:bg-gold-glow text-background">
                Concluir
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
