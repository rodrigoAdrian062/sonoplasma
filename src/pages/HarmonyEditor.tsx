import { ChangeEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AudioLines, Download, Loader2, Music2, Pause, Play, Plus, Save, Library,
  Search, SkipBack, Square, Trash2, Upload, Volume2, VolumeX, ZoomIn, ZoomOut, Sparkles,
  ExternalLink, KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useSections } from '@/hooks/useSections';
import { useStages } from '@/hooks/useStages';
import { useUserAccess } from '@/hooks/useUserAccess';
import { hasPermission } from '@/lib/access';
import { supabase } from '@/integrations/supabase/client';
import { loadCloudState, saveCloudStateDebounced } from '@/lib/cloudState';
import { quickSoundKind } from '@/lib/quickSounds';
import {
  appendHarmonyTrack, encodeWav, formatTime, getProjectDuration, getTrackDuration, trimHarmonyTrack,
  HARMONY_CLOUD_KEY, HARMONY_STORAGE_KEY, normalizeHarmonyProject, normalizeHarmonyTrack,
  type HarmonyProject, type HarmonyTrack,
} from '@/lib/harmonyEditor';
import type { AudioLibraryItem } from '@/types/audioLibrary';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const TRACK_HEIGHT = 96;
const DEFAULT_PROJECT: HarmonyProject = { name: 'Minha harmonia', tracks: [], version: 3 };

type DragMode = 'move' | 'trim-start' | 'trim-end';
interface TrackDrag {
  id: string;
  mode: DragMode;
  pointerX: number;
  start: number;
  trimStart: number;
  trimEnd: number;
}

interface HarmonyMusicSuggestion {
  nome: string;
  artista?: string;
  motivo?: string;
  categoria?: string;
  duracao?: string;
  bpm?: number;
  solenidade?: number;
  youtube_search_url: string;
}

interface HarmonyAdvice {
  library: AudioLibraryItem[];
  external: HarmonyMusicSuggestion[];
  sectionName: string;
  stageName: string;
}

function readLocalProject(): HarmonyProject {
  try {
    const value = localStorage.getItem(HARMONY_STORAGE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : null;
    if (
      parsed && typeof parsed === 'object' &&
      'name' in parsed && typeof parsed.name === 'string' &&
      'tracks' in parsed && Array.isArray(parsed.tracks)
    ) {
      return normalizeHarmonyProject(parsed as HarmonyProject);
    }
  } catch {
    toast.error('Não foi possível carregar o projeto salvo neste dispositivo.');
  }
  return DEFAULT_PROJECT;
}

function getWaveform(buffer: AudioBuffer, bars = 120): number[] {
  const channel = buffer.getChannelData(0);
  const samplesPerBar = Math.max(1, Math.floor(channel.length / bars));
  return Array.from({ length: bars }, (_, index) => {
    const from = index * samplesPerBar;
    const to = Math.min(channel.length, from + samplesPerBar);
    let peak = 0;
    for (let sample = from; sample < to; sample += 1) peak = Math.max(peak, Math.abs(channel[sample]));
    return peak;
  });
}

function getTrackGain(track: HarmonyTrack, clipTime: number, clipDuration: number): number {
  let envelope = track.volume;
  if (track.fadeIn > 0) envelope *= Math.min(1, clipTime / track.fadeIn);
  if (track.fadeOut > 0) envelope *= Math.min(1, Math.max(0, (clipDuration - clipTime) / track.fadeOut));
  return envelope;
}

function scheduleTrackGain(
  gain: GainNode,
  track: HarmonyTrack,
  clipDuration: number,
  clipPosition: number,
  startTime: number,
) {
  const points = [clipPosition, track.fadeIn, clipDuration - track.fadeOut, clipDuration]
    .filter((point, index, all) =>
      Number.isFinite(point) &&
      point >= clipPosition &&
      point <= clipDuration &&
      all.indexOf(point) === index,
    )
    .sort((a, b) => a - b);
  const first = points[0] ?? clipPosition;
  gain.gain.setValueAtTime(getTrackGain(track, first, clipDuration), startTime);
  for (const point of points.slice(1)) {
    gain.gain.linearRampToValueAtTime(
      getTrackGain(track, point, clipDuration),
      startTime + point - clipPosition,
    );
  }
}

export default function HarmonyEditorPage() {
  const navigate = useNavigate();
  const { audios, isLoading, uploadAndAddAudio } = useAudioLibrary();
  const { sections } = useSections();
  const { stages } = useStages();
  const { access, isLoading: isLoadingAccess } = useUserAccess();
  const canUseAI = hasPermission(access, 'canUseAI');
  const [project, setProject] = useState<HarmonyProject>(readLocalProject);
  const [activeTab, setActiveTab] = useState('editor');
  const [search, setSearch] = useState('');
  const [adviceSectionId, setAdviceSectionId] = useState('');
  const [adviceStageId, setAdviceStageId] = useState('');
  const [adviceDescription, setAdviceDescription] = useState('');
  const [advice, setAdvice] = useState<HarmonyAdvice | null>(null);
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);
  const [openAIKey, setOpenAIKey] = useState('');
  const [openAIKeySuffix, setOpenAIKeySuffix] = useState<string | null>(null);
  const [isOpenAIConnected, setIsOpenAIConnected] = useState(false);
  const [isLoadingOpenAIConnection, setIsLoadingOpenAIConnection] = useState(false);
  const [isSavingOpenAIConnection, setIsSavingOpenAIConnection] = useState(false);
  const [isRemovingOpenAIConnection, setIsRemovingOpenAIConnection] = useState(false);
  const [zoom, setZoom] = useState(48);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [waveforms, setWaveforms] = useState<Record<string, number[]>>({});
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const decodedRef = useRef(new Map<string, AudioBuffer>());
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackStartedAtRef = useRef(0);
  const playbackOffsetRef = useRef(0);
  const dragRef = useRef<TrackDrag | null>(null);
  const hydratedRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const mixDuration = getProjectDuration(project.tracks);
  const selectedClip = project.tracks.find((track) => track.id === selectedClipId) ?? project.tracks.at(-1);
  const timelineDuration = Math.max(30, Math.ceil((mixDuration + 15) / 10) * 10);
  const timelineWidth = timelineDuration * zoom;
  const pxPerSecond = zoom;
  const directAudios = useMemo(
    () => audios.filter((audio) => quickSoundKind(audio.audio_url) === 'file'),
    [audios],
  );
  const sectionStages = useMemo(
    () => stages.filter((stage) => stage.secao_id === adviceSectionId),
    [stages, adviceSectionId],
  );
  const filteredAudios = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return directAudios.filter((audio) => !query || audio.nome.toLocaleLowerCase().includes(query));
  }, [directAudios, search]);

  const decodeTrack = useCallback(async (audioUrl: string): Promise<AudioBuffer> => {
    const cached = decodedRef.current.get(audioUrl);
    if (cached) return cached;
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`Falha ao carregar o áudio (${response.status}).`);
    const bytes = await response.arrayBuffer();
    const context = getAudioContext();
    const decoded = await context.decodeAudioData(bytes);
    decodedRef.current.set(audioUrl, decoded);
    setWaveforms((current) => ({ ...current, [audioUrl]: getWaveform(decoded) }));
    return decoded;
  }, [getAudioContext]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await loadCloudState<HarmonyProject>(HARMONY_CLOUD_KEY);
      if (cancelled) return;
      if (remote && typeof remote.name === 'string' && Array.isArray(remote.tracks)) {
        const normalized = normalizeHarmonyProject(remote);
        setProject(normalized);
        localStorage.setItem(HARMONY_STORAGE_KEY, JSON.stringify(normalized));
      }
      hydratedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const savedProject = normalizeHarmonyProject({ ...project, version: 3 });
    localStorage.setItem(HARMONY_STORAGE_KEY, JSON.stringify(savedProject));
    saveCloudStateDebounced(HARMONY_CLOUD_KEY, savedProject);
  }, [project]);

  const stopPlayback = useCallback(() => {
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    playbackTimerRef.current = null;
    for (const source of sourcesRef.current) {
      try { source.stop(); } catch { /* source may already have ended */ }
      source.disconnect();
    }
    sourcesRef.current = [];
    setIsPlaying(false);
  }, []);

  const playFrom = useCallback(async (position: number) => {
    stopPlayback();
    if (!Number.isFinite(position) || !project.tracks.length || !Number.isFinite(mixDuration) || mixDuration <= 0) {
      if (!Number.isFinite(position)) toast.error('A posição de reprodução é inválida.');
      return;
    }
    try {
      const context = getAudioContext();
      await context.resume();
      const currentTime = context.currentTime;
      if (!Number.isFinite(currentTime)) throw new Error('Relógio de áudio inválido.');
      const safePosition = Math.max(0, Math.min(position, mixDuration));
      const sources: AudioBufferSourceNode[] = [];
      sourcesRef.current = sources;

      for (const rawTrack of project.tracks) {
        const validTrack = normalizeHarmonyTrack(rawTrack);
        if (!validTrack || validTrack.muted) continue;
        const buffer = await decodeTrack(validTrack.audioUrl);
        const track = normalizeHarmonyTrack({ ...validTrack, duration: buffer.duration });
        if (!track) continue;
        const clipDuration = getTrackDuration(track);
        const clipEnd = track.start + clipDuration;
        if (!Number.isFinite(clipEnd) || clipEnd <= safePosition) continue;
        const progress = Math.max(0, safePosition - track.start);
        const offset = track.trimStart + progress;
        const remainingDuration = clipDuration - progress;
        if (
          !Number.isFinite(offset) ||
          !Number.isFinite(remainingDuration) ||
          !Number.isFinite(track.start) ||
          offset < 0 ||
          remainingDuration <= 0 ||
          offset + remainingDuration > buffer.duration + 0.05
        ) {
          continue;
        }
        const beginsIn = Math.max(0, track.start - safePosition);
        const clipPositionAtStart = Math.max(0, safePosition - track.start);
        const actualStart = currentTime + beginsIn;
        if (!Number.isFinite(actualStart) || !Number.isFinite(clipPositionAtStart)) continue;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(context.destination);
        scheduleTrackGain(gain, track, clipDuration, clipPositionAtStart, actualStart);
        sources.push(source);
        source.start(actualStart, offset, remainingDuration);
      }

      if (sources.length === 0) throw new Error('Não há trechos válidos para reproduzir. Confira os cortes das músicas.');
      playbackOffsetRef.current = safePosition;
      playbackStartedAtRef.current = currentTime;
      setPlayhead(safePosition);
      setIsPlaying(true);
      playbackTimerRef.current = setInterval(() => {
        const nextPosition = playbackOffsetRef.current +
          ((audioContextRef.current?.currentTime ?? playbackStartedAtRef.current) - playbackStartedAtRef.current);
        if (nextPosition >= mixDuration) {
          setPlayhead(mixDuration);
          stopPlayback();
          return;
        }
        setPlayhead(nextPosition);
      }, 50);
    } catch (error) {
      stopPlayback();
      toast.error(error instanceof Error ? error.message : 'Não foi possível reproduzir a mixagem.');
    }
  }, [decodeTrack, getAudioContext, mixDuration, project.tracks, stopPlayback]);

  useEffect(() => () => {
    stopPlayback();
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close();
  }, [stopPlayback]);

  const addAudioToTimeline = async (audio: AudioLibraryItem, notify = true): Promise<boolean> => {
    setLoadingAudioId(audio.id);
    try {
      const buffer = await decodeTrack(audio.audio_url);
      const duration = buffer.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('O arquivo não informou uma duração de áudio válida.');
      }
      const track: HarmonyTrack = {
        id: crypto.randomUUID(),
        audioId: audio.id,
        nome: audio.nome,
        audioUrl: audio.audio_url,
        duration,
        start: 0,
        trimStart: 0,
        trimEnd: duration,
        volume: 0.8,
        fadeIn: 0,
        fadeOut: 0,
        muted: false,
      };
      setProject((current) => ({
        ...current,
        tracks: appendHarmonyTrack(current.tracks, track),
      }));
      setSelectedClipId(track.id);
      if (notify) toast.success(`"${audio.nome}" adicionada à linha do tempo.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar este áudio.');
      return false;
    } finally {
      setLoadingAudioId(null);
    }
  };

  const requestHarmonyAdvice = async () => {
    if (!canUseAI) {
      toast.error('O assistente Mestre de Harmonia exige permissão de IA no seu plano.');
      return;
    }
    if (!isOpenAIConnected) {
      toast.error('Conecte sua chave da OpenAI antes de pedir uma proposta.');
      setActiveTab('master');
      return;
    }
    const section = sections.find((item) => item.id === adviceSectionId);
    if (!section) {
      toast.error('Selecione uma seção do roteiro.');
      return;
    }
    const stage = sectionStages.find((item) => item.id === adviceStageId);
    const stageTitle = stage?.nome_simbolico || section.nome;
    const stageDescription = [section.descricao, stage?.descricao, stage?.ritual_detalhes]
      .filter(Boolean)
      .join('\n');
    const userHint = adviceDescription.trim();
    if (!userHint) {
      toast.error('Descreva o momento, o clima e o resultado musical que deseja.');
      return;
    }

    setIsGettingAdvice(true);
    setAdvice(null);
    try {
      const available = directAudios.slice(0, 800);
      const [libraryResponse, musicResponse] = await Promise.all([
        available.length > 0
          ? supabase.functions.invoke('suggest-audios', {
              body: {
                stageTitle,
                stageDescription,
                userHint,
                limit: 6,
                library: available.map((audio) => ({
                  id: audio.id,
                  nome: audio.nome,
                  audio_url: audio.audio_url,
                })),
              },
            })
          : Promise.resolve({ data: { indices: [] }, error: null }),
        supabase.functions.invoke('suggest-youtube-tracks', {
          body: {
            stageTitle,
            stageDescription,
            userHint,
            sessionType: section.nome,
            limit: 5,
          },
        }),
      ]);
      if (libraryResponse.error) throw new Error(`Falha ao analisar a biblioteca: ${libraryResponse.error.message}`);
      if (musicResponse.error) throw new Error(`Falha ao gerar referências musicais: ${musicResponse.error.message}`);

      const indices: unknown[] = Array.isArray(libraryResponse.data?.indices)
        ? libraryResponse.data.indices
        : [];
      const librarySuggestions = indices
        .map((index) => Number(index))
        .filter((index) => Number.isInteger(index) && index >= 0 && index < available.length)
        .map((index) => available[index]);
      const externalSuggestions: HarmonyMusicSuggestion[] = Array.isArray(musicResponse.data?.suggestions)
        ? musicResponse.data.suggestions.filter(
            (item: unknown): item is HarmonyMusicSuggestion =>
              typeof item === 'object' &&
              item !== null &&
              'nome' in item &&
              typeof item.nome === 'string' &&
              'youtube_search_url' in item &&
              typeof item.youtube_search_url === 'string',
          )
        : [];

      setAdvice({
        library: librarySuggestions,
        external: externalSuggestions,
        sectionName: section.nome,
        stageName: stageTitle,
      });
      if (librarySuggestions.length === 0 && externalSuggestions.length === 0) {
        toast.info('Não encontrei sugestões desta vez. Tente detalhar melhor o clima ou o momento.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível consultar o Mestre de Harmonia.');
    } finally {
      setIsGettingAdvice(false);
    }
  };

  const loadOpenAIConnection = useCallback(async () => {
    setIsLoadingOpenAIConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-openai-connection', {
        body: { action: 'status' },
      });
      if (error) throw new Error(error.message);
      setIsOpenAIConnected(Boolean(data?.connected));
      setOpenAIKeySuffix(typeof data?.keySuffix === 'string' ? data.keySuffix : null);
    } catch (error) {
      toast.error(error instanceof Error ? `Não foi possível consultar a conexão: ${error.message}` : 'Não foi possível consultar a conexão OpenAI.');
    } finally {
      setIsLoadingOpenAIConnection(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'master') void loadOpenAIConnection();
  }, [activeTab, loadOpenAIConnection]);

  const connectOpenAI = async () => {
    const key = openAIKey.trim();
    if (!key) {
      toast.error('Cole sua chave da API OpenAI.');
      return;
    }

    setIsSavingOpenAIConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-openai-connection', {
        body: { action: 'connect', apiKey: key },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(String(data.error));
      setIsOpenAIConnected(Boolean(data?.connected));
      setOpenAIKeySuffix(typeof data?.keySuffix === 'string' ? data.keySuffix : null);
      setOpenAIKey('');
      toast.success('Chave OpenAI validada e conectada à sua conta.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível conectar a chave OpenAI.');
    } finally {
      setIsSavingOpenAIConnection(false);
    }
  };

  const disconnectOpenAI = async () => {
    setIsRemovingOpenAIConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-openai-connection', {
        body: { action: 'disconnect' },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(String(data.error));
      setIsOpenAIConnected(false);
      setOpenAIKeySuffix(null);
      setOpenAIKey('');
      toast.success('Chave OpenAI removida da sua conta.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a chave OpenAI.');
    } finally {
      setIsRemovingOpenAIConnection(false);
    }
  };

  const applyLibraryAdvice = async () => {
    if (!advice?.library.length) return;
    let addedCount = 0;
    for (const audio of advice.library) {
      if (await addAudioToTimeline(audio, false)) addedCount += 1;
    }
    if (addedCount > 0) {
      toast.success(`${addedCount} sugestão(ões) adicionada(s) ao final da harmonia.`);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error('Selecione um arquivo de áudio.');
      return;
    }
    try {
      const added = await uploadAndAddAudio(file, file.name.replace(/\.[^.]+$/, ''));
      await addAudioToTimeline(added);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao enviar o áudio.');
    }
  };

  const updateTrack = (id: string, update: Partial<HarmonyTrack>) => {
    setProject((current) => ({
      ...current,
      tracks: current.tracks.map((track) => {
        if (track.id !== id) return track;
        return normalizeHarmonyTrack({ ...track, ...update }) ?? track;
      }),
    }));
  };

  const removeTrack = (id: string) => {
    setProject((current) => ({ ...current, tracks: current.tracks.filter((track) => track.id !== id) }));
  };

  const beginTrackDrag = (event: PointerEvent<HTMLDivElement>, track: HarmonyTrack, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: track.id,
      mode,
      pointerX: event.clientX,
      start: track.start,
      trimStart: track.trimStart,
      trimEnd: track.trimEnd,
    };
  };

  const moveTrackDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (event.clientX - drag.pointerX) / pxPerSecond;
    if (!Number.isFinite(delta)) return;
    const track = project.tracks.find((item) => item.id === drag.id);
    if (!track) return;
    if (drag.mode === 'move') {
      updateTrack(drag.id, { start: Math.max(0, drag.start + delta) });
    } else if (drag.mode === 'trim-start') {
      const trimStart = Math.max(0, Math.min(drag.trimEnd - 0.25, drag.trimStart + delta));
      setProject((current) => ({
        ...current,
        tracks: trimHarmonyTrack(current.tracks, drag.id, trimStart, drag.trimEnd),
      }));
    } else {
      const trimEnd = Math.max(drag.trimStart + 0.25, Math.min(drag.duration, drag.trimEnd + delta));
      setProject((current) => ({
        ...current,
        tracks: trimHarmonyTrack(current.tracks, drag.id, drag.trimStart, trimEnd),
      }));
    }
  };

  const endTrackDrag = () => { dragRef.current = null; };

  const renderMix = async (): Promise<Blob> => {
    if (!project.tracks.length || mixDuration <= 0) {
      throw new Error('Adicione ao menos uma música antes de renderizar a harmonia.');
    }
    const sampleRate = 44100;
    const frameCount = Math.ceil(mixDuration * sampleRate);
    if (!Number.isSafeInteger(frameCount) || frameCount <= 0) {
      throw new Error('A duração da harmonia não é válida para renderização.');
    }
    const context = new OfflineAudioContext(2, frameCount, sampleRate);
    let scheduledSources = 0;
    for (const rawTrack of project.tracks) {
      const initialTrack = normalizeHarmonyTrack(rawTrack);
      if (!initialTrack || initialTrack.muted) continue;
      const buffer = await decodeTrack(initialTrack.audioUrl);
      const track = normalizeHarmonyTrack({ ...initialTrack, duration: buffer.duration });
      if (!track) continue;
      const clipDuration = getTrackDuration(track);
      const start = track.start;
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(track.trimStart) ||
        !Number.isFinite(clipDuration) ||
        start < 0 ||
        clipDuration <= 0 ||
        start + clipDuration > mixDuration + 0.05 ||
        track.trimStart + clipDuration > buffer.duration + 0.05
      ) {
        continue;
      }
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(context.destination);
      scheduleTrackGain(gain, track, clipDuration, 0, start);
      source.start(start, track.trimStart, clipDuration);
      scheduledSources += 1;
    }
    if (scheduledSources === 0) throw new Error('Não há trechos válidos para salvar na mixagem.');
    const rendered = await context.startRendering();
    return encodeWav(rendered);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const wav = await renderMix();
      const url = URL.createObjectURL(wav);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.trim() || 'harmonia'}.wav`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success('Mixagem exportada em WAV.');
    } catch (error) {
      toast.error(error instanceof Error ? `Falha na exportação: ${error.message}` : 'Falha ao exportar a mixagem.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToLibrary = async () => {
    setIsSavingToLibrary(true);
    try {
      const wav = await renderMix();
      const projectName = project.name.trim() || 'Minha harmonia';
      const safeFileName = projectName.replace(/[\\/:*?"<>|]/g, '-');
      const file = new File([wav], `${safeFileName}.wav`, { type: 'audio/wav' });
      await uploadAndAddAudio(file, projectName);
      toast.success(`"${projectName}" foi salva na Biblioteca de Áudios.`);
    } catch (error) {
      toast.error(error instanceof Error ? `Falha ao salvar na biblioteca: ${error.message}` : 'Falha ao salvar na biblioteca.');
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) stopPlayback();
    else void playFrom(playhead >= mixDuration ? 0 : playhead);
  };

  const rulerMarks = useMemo(() => {
    const interval = zoom < 32 ? 10 : 5;
    return Array.from({ length: Math.floor(timelineDuration / interval) + 1 }, (_, index) => index * interval);
  }, [timelineDuration, zoom]);

  const harmonyAssistant = (
    <section className="mx-auto w-full max-w-4xl rounded-xl border border-gold/25 bg-gold/5 p-4 sm:p-6">
      <div className="mb-2 flex items-center gap-2 text-gold">
        <Sparkles size={20} />
        <h2 className="text-lg font-semibold">Mestre de Harmonia</h2>
      </div>
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
        Descreva o momento do roteiro e a intenção musical. A proposta considera o acervo disponível e oferece referências para pesquisa; você revisa tudo antes de aplicar.
      </p>

      <div className="mb-6 rounded-lg border border-border bg-background/70 p-4">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound size={17} className="text-gold" />
          <h3 className="font-semibold">Conectar minha API OpenAI</h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Use uma chave da API da OpenAI. Ela fica criptografada no servidor e vinculada somente à sua conta; o uso é cobrado pela OpenAI separadamente do ChatGPT Plus.
        </p>
        {isLoadingOpenAIConnection ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> Verificando conexão…
          </p>
        ) : isOpenAIConnected ? (
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-green-600 dark:text-green-400">Conectada · chave terminada em {openAIKeySuffix}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void disconnectOpenAI()}
              disabled={isRemovingOpenAIConnection || isSavingOpenAIConnection}
            >
              {isRemovingOpenAIConnection && <Loader2 size={14} className="mr-2 animate-spin" />}
              Desconectar
            </Button>
          </div>
        ) : (
          <p className="mb-3 text-sm text-muted-foreground">Nenhuma chave OpenAI conectada a esta conta.</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            autoComplete="new-password"
            value={openAIKey}
            onChange={(event) => setOpenAIKey(event.target.value)}
            placeholder="Cole aqui sua chave sk-…"
            aria-label="Chave pessoal da API OpenAI"
            className="min-w-0 flex-1"
            disabled={isSavingOpenAIConnection || isRemovingOpenAIConnection}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void connectOpenAI()}
            disabled={isLoadingOpenAIConnection || isSavingOpenAIConnection || isRemovingOpenAIConnection || !openAIKey.trim()}
          >
            {isSavingOpenAIConnection ? <Loader2 size={15} className="mr-2 animate-spin" /> : <KeyRound size={15} className="mr-2" />}
            {isOpenAIConnected ? 'Trocar chave' : 'Conectar'}
          </Button>
        </div>
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-gold underline-offset-4 hover:underline"
        >
          Criar ou gerenciar chave na OpenAI
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-muted-foreground">
          Seção do roteiro
          <select
            value={adviceSectionId}
            onChange={(event) => {
              setAdviceSectionId(event.target.value);
              setAdviceStageId('');
              setAdvice(null);
            }}
            disabled={isLoadingAccess || sections.length === 0}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">Selecione uma seção</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>{section.nome}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-muted-foreground">
          Etapa específica (opcional)
          <select
            value={adviceStageId}
            onChange={(event) => {
              setAdviceStageId(event.target.value);
              setAdvice(null);
            }}
            disabled={!adviceSectionId || sectionStages.length === 0}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">Considerar a seção inteira</option>
            {sectionStages.map((stage) => (
              <option key={stage.id} value={stage.id}>{stage.nome_simbolico}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm text-muted-foreground">
        Descreva o momento e o que deseja transmitir
        <Textarea
          value={adviceDescription}
          onChange={(event) => setAdviceDescription(event.target.value)}
          placeholder="Ex.: entrada solene, começar suave e crescer discretamente; sem vocal e sem competir com a fala."
          rows={4}
          className="mt-1 min-h-[110px]"
          maxLength={1000}
        />
      </label>
      <Button
        type="button"
        className="mt-4 w-full gap-2 sm:w-auto"
        onClick={() => void requestHarmonyAdvice()}
        disabled={isGettingAdvice || isLoadingAccess || !canUseAI || !isOpenAIConnected || !adviceSectionId || !adviceDescription.trim()}
        title={!canUseAI ? 'Recurso de IA não disponível no plano atual' : undefined}
      >
        {isGettingAdvice ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {isGettingAdvice ? 'Analisando roteiro e acervo…' : 'Pedir proposta de harmonia'}
      </Button>
      {!isLoadingAccess && !canUseAI && (
        <p className="mt-2 text-xs text-muted-foreground">
          O acesso ao assistente de IA não está habilitado no seu plano.
        </p>
      )}

      {advice && (
        <div className="mt-6 space-y-5 border-t border-gold/15 pt-5">
          <div>
            <h3 className="font-semibold">Proposta para {advice.stageName}</h3>
            <p className="text-sm text-muted-foreground">Seção: {advice.sectionName}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              A recomendação prioriza música instrumental, volume de apoio e coerência com o momento. Confirme a adequação ao rito e às orientações da sua Loja.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gold">Do seu acervo</h3>
              {advice.library.length > 0 ? (
                <>
                  <ol className="space-y-2">
                    {advice.library.map((audio, index) => (
                      <li key={audio.id} className="flex items-center gap-2 rounded-md bg-background/70 p-2 text-sm">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <span className="min-w-0 flex-1 truncate" title={audio.nome}>{audio.nome}</span>
                      </li>
                    ))}
                  </ol>
                  <Button type="button" variant="outline" className="mt-3 gap-2" onClick={() => void applyLibraryAdvice()}>
                    <Plus size={15} /> Aplicar sequência ao editor
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma faixa do acervo foi considerada adequada para esta descrição.</p>
              )}
            </div>

            {advice.external.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gold">Referências para pesquisar</h3>
                <ol className="space-y-2">
                  {advice.external.map((suggestion, index) => (
                    <li key={`${suggestion.nome}-${index}`} className="rounded-md bg-background/70 p-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-muted-foreground">{index + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{suggestion.nome}</p>
                          {suggestion.artista && <p className="text-xs text-muted-foreground">{suggestion.artista}</p>}
                          {suggestion.motivo && <p className="mt-1 text-xs text-muted-foreground">{suggestion.motivo}</p>}
                          <div className="mt-2 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
                            {suggestion.categoria && <span>{suggestion.categoria}</span>}
                            {suggestion.duracao && <span>{suggestion.duracao}</span>}
                            {suggestion.solenidade && <span>Solenidade {suggestion.solenidade}/5</span>}
                          </div>
                        </div>
                        <a
                          href={suggestion.youtube_search_url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-gold hover:text-gold/80"
                          aria-label={`Pesquisar ${suggestion.nome} no YouTube`}
                          title="Pesquisar no YouTube"
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-2 text-gold">
          <AudioLines size={21} />
          <h1 className="font-display text-lg font-semibold">Montar Harmonia</h1>
        </div>
        {activeTab === 'editor' && (
          <>
            <Input
              aria-label="Nome do projeto"
              value={project.name}
              onChange={(event) => setProject((current) => ({ ...current, name: event.target.value }))}
              className="ml-auto h-9 max-w-[220px]"
            />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                try {
                  localStorage.setItem(HARMONY_STORAGE_KEY, JSON.stringify(project));
                  saveCloudStateDebounced(HARMONY_CLOUD_KEY, project, 0);
                  toast.success('Projeto salvo.');
                } catch (error) {
                  toast.error(error instanceof Error ? `Não foi possível salvar: ${error.message}` : 'Não foi possível salvar o projeto.');
                }
              }}
            >
              <Save size={16} /> Salvar projeto
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleSaveToLibrary()}
              disabled={isSavingToLibrary || isExporting || !project.tracks.length}
              className="gap-2"
            >
              {isSavingToLibrary ? <Loader2 size={16} className="animate-spin" /> : <Library size={16} />}
              Salvar na biblioteca
            </Button>
            <Button onClick={() => void handleExport()} disabled={isExporting || isSavingToLibrary || !project.tracks.length} className="gap-2">
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Exportar WAV
            </Button>
          </>
        )}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-[calc(100vh-64px)]">
        <TabsList className="mx-4 mt-3">
          <TabsTrigger value="editor">Montar Harmonia</TabsTrigger>
          <TabsTrigger value="master">Mestre de Harmonia</TabsTrigger>
        </TabsList>
        <TabsContent value="editor" className="mt-0">
      <div className="grid min-h-[calc(100vh-112px)] grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-card/40 p-4 xl:border-b-0 xl:border-r">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Biblioteca de áudio</h2>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Importar
            </Button>
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
          </div>
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar áudio..." className="pl-9" />
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Adicione arquivos de áudio diretos. YouTube e Spotify não podem ser mixados/exportados.</p>
          <div className="max-h-[32vh] space-y-1 overflow-y-auto xl:max-h-[calc(100vh-480px)]">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gold" /></div>
            ) : filteredAudios.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum áudio compatível encontrado.</p>
            ) : filteredAudios.map((audio) => (
              <button
                key={audio.id}
                type="button"
                disabled={loadingAudioId === audio.id}
                onClick={() => void addAudioToTimeline(audio)}
                aria-label={`Adicionar ${audio.nome} no fim da sequência`}
                title="Adicionar no fim da mesma linha"
                className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left hover:border-gold/20 hover:bg-secondary/60 disabled:opacity-50"
              >
                {loadingAudioId === audio.id ? <Loader2 size={16} className="animate-spin text-gold" /> : <Plus size={16} className="text-gold" />}
                <span className="min-w-0 flex-1 truncate text-sm">{audio.nome}</span>
                <Music2 size={15} className="shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Ir ao início" onClick={() => { setPlayhead(0); if (isPlaying) void playFrom(0); }}>
              <SkipBack size={16} />
            </Button>
            <Button variant="outline" size="icon" aria-label={isPlaying ? 'Pausar' : 'Reproduzir'} onClick={togglePlayback}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            <Button variant="outline" size="icon" aria-label="Parar" onClick={() => { stopPlayback(); setPlayhead(0); }}>
              <Square size={14} />
            </Button>
            <span className="min-w-[110px] font-mono text-sm tabular-nums">{formatTime(playhead)} / {formatTime(mixDuration)}</span>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Diminuir zoom" disabled={zoom <= 16} onClick={() => setZoom((value) => Math.max(16, value - 8))}><ZoomOut size={16} /></Button>
              <span className="w-12 text-center text-xs text-muted-foreground">{zoom}px/s</span>
              <Button variant="ghost" size="icon" aria-label="Aumentar zoom" disabled={zoom >= 96} onClick={() => setZoom((value) => Math.min(96, value + 8))}><ZoomIn size={16} /></Button>
            </div>
          </div>

          <div ref={scrollRef} className="overflow-auto rounded-xl border border-border bg-card/30">
            <div className="min-w-max">
              <div className="sticky top-0 z-10 flex border-b border-border bg-card">
                <div className="sticky left-0 z-20 w-48 shrink-0 border-r border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
                  Faixa única · {project.tracks.length} clipe{project.tracks.length === 1 ? '' : 's'}
                </div>
                <div
                  className="relative h-9 cursor-crosshair"
                  style={{ width: timelineWidth }}
                  onClick={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const next = Math.max(0, Math.min(mixDuration, (event.clientX - bounds.left) / pxPerSecond));
                    if (isPlaying) void playFrom(next);
                    else setPlayhead(next);
                  }}
                >
                  {rulerMarks.map((second) => (
                    <div key={second} className="absolute top-0 h-full border-l border-border/70 pl-1 pt-1 text-[10px] text-muted-foreground" style={{ left: second * pxPerSecond }}>
                      {formatTime(second)}
                    </div>
                  ))}
                </div>
              </div>

              {project.tracks.length === 0 ? (
                <div className="flex min-h-52 items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                  <Plus size={16} className="text-gold" /> Escolha áudios na biblioteca para começar a montar sua harmonia.
                </div>
              ) : (
                <div className="flex border-b border-border/70" style={{ height: TRACK_HEIGHT }}>
                  <div className="sticky left-0 z-[5] flex w-48 shrink-0 flex-col justify-center border-r border-border bg-card px-3">
                    <div className="text-xs font-semibold">Sequência</div>
                    <div className="text-[10px] text-muted-foreground">{project.tracks.length} clipe{project.tracks.length === 1 ? '' : 's'} · {formatTime(mixDuration)}</div>
                  </div>
                  <div
                    className="relative bg-[linear-gradient(to_right,hsl(var(--border)/.4)_1px,transparent_1px)]"
                    style={{ width: timelineWidth, backgroundSize: `${pxPerSecond * 5}px 100%` }}
                    onClick={(event) => {
                      if (dragRef.current) return;
                      const bounds = event.currentTarget.getBoundingClientRect();
                      const next = Math.max(0, Math.min(mixDuration, (event.clientX - bounds.left) / pxPerSecond));
                      if (isPlaying) void playFrom(next);
                      else setPlayhead(next);
                    }}
                  >
                    {project.tracks.map((track, index) => {
                      const duration = getTrackDuration(track);
                      const width = Math.max(28, duration * pxPerSecond);
                      return (
                        <div
                          key={track.id}
                          className={cn(
                            'absolute top-4 h-[64px] touch-none overflow-hidden rounded-md border bg-gold/15',
                            track.muted ? 'opacity-40' : 'border-gold/50',
                            selectedClip?.id === track.id && 'ring-2 ring-gold ring-offset-1 ring-offset-background',
                          )}
                          style={{ left: track.start * pxPerSecond, width }}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedClipId(track.id);
                          }}
                          onPointerMove={moveTrackDrag}
                          onPointerUp={endTrackDrag}
                          onPointerCancel={endTrackDrag}
                          onPointerDown={(event) => {
                            setSelectedClipId(track.id);
                            beginTrackDrag(event, track, 'move');
                          }}
                          title={`${track.nome} — arraste para reposicionar; arraste as bordas para cortar`}
                        >
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-around gap-px overflow-hidden px-2 opacity-70">
                            {(waveforms[track.audioUrl] ?? Array.from({ length: 60 }, (_, i) => 0.2 + ((i * 29 + index * 11) % 60) / 100)).map((peak, i) => (
                              <span key={i} className="w-[2px] shrink-0 rounded-full bg-gold" style={{ height: `${Math.max(8, peak * 80)}%` }} />
                            ))}
                          </div>
                          <span className="pointer-events-none absolute inset-x-2 top-1 truncate text-[10px] font-semibold text-foreground">{index + 1}. {track.nome}</span>
                          <span className="pointer-events-none absolute bottom-1 left-2 text-[9px] text-muted-foreground">{formatTime(track.trimStart)}</span>
                          <span className="pointer-events-none absolute bottom-1 right-2 text-[9px] text-muted-foreground">{formatTime(track.trimEnd)}</span>
                          {track.fadeIn > 0 && <div className="pointer-events-none absolute bottom-0 left-0 h-5 border-l-2 border-gold" style={{ width: track.fadeIn * pxPerSecond }} />}
                          {track.fadeOut > 0 && <div className="pointer-events-none absolute bottom-0 right-0 h-5 border-r-2 border-gold" style={{ width: track.fadeOut * pxPerSecond }} />}
                          <div
                            className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize bg-gold/80"
                            onPointerDown={(event) => beginTrackDrag(event, track, 'trim-start')}
                            aria-label={`Cortar início de ${track.nome}`}
                          />
                          <div
                            className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize bg-gold/80"
                            onPointerDown={(event) => beginTrackDrag(event, track, 'trim-end')}
                            aria-label={`Cortar fim de ${track.nome}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {project.tracks.length > 0 && (
            <div className="mt-4 space-y-2 rounded-xl border border-border bg-card/40 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
                  Clipe selecionado: {selectedClip?.nome}
                </h2>
                {selectedClip && (
                  <>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-gold"
                      aria-label={selectedClip.muted ? 'Ativar clipe' : 'Silenciar clipe'}
                      onClick={() => updateTrack(selectedClip.id, { muted: !selectedClip.muted })}
                    >
                      {selectedClip.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <Slider
                      value={[selectedClip.volume * 100]}
                      max={100}
                      step={1}
                      onValueChange={([value]) => updateTrack(selectedClip.id, { volume: value / 100 })}
                      className="w-24"
                      aria-label={`Volume ${selectedClip.nome}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${selectedClip.nome}`}
                      onClick={() => removeTrack(selectedClip.id)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </>
                )}
              </div>
              {selectedClip && (
                <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-2 sm:grid-cols-4">
                  <label className="text-[10px] text-muted-foreground">Posição (s)
                    <Input type="number" min="0" step="0.1" value={selectedClip.start.toFixed(1)} onChange={(event) => updateTrack(selectedClip.id, { start: Math.max(0, Number(event.target.value)) })} className="mt-1 h-8" />
                  </label>
                  <label className="text-[10px] text-muted-foreground">Início do corte (s)
                    <Input type="number" min="0" max={selectedClip.trimEnd - 0.25} step="0.1" value={selectedClip.trimStart.toFixed(1)} onChange={(event) => setProject((current) => ({ ...current, tracks: trimHarmonyTrack(current.tracks, selectedClip.id, Math.max(0, Math.min(selectedClip.trimEnd - 0.25, Number(event.target.value))), selectedClip.trimEnd) }))} className="mt-1 h-8" />
                  </label>
                  <label className="text-[10px] text-muted-foreground">Fim do corte (s)
                    <Input type="number" min={selectedClip.trimStart + 0.25} max={selectedClip.duration} step="0.1" value={selectedClip.trimEnd.toFixed(1)} onChange={(event) => setProject((current) => ({ ...current, tracks: trimHarmonyTrack(current.tracks, selectedClip.id, selectedClip.trimStart, Math.max(selectedClip.trimStart + 0.25, Math.min(selectedClip.duration, Number(event.target.value)))) }))} className="mt-1 h-8" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-muted-foreground">Fade-in (s)
                      <Input type="number" min="0" max={getTrackDuration(selectedClip)} step="0.1" value={selectedClip.fadeIn} onChange={(event) => updateTrack(selectedClip.id, { fadeIn: Math.max(0, Math.min(getTrackDuration(selectedClip), Number(event.target.value))) })} className="mt-1 h-8" />
                    </label>
                    <label className="text-[10px] text-muted-foreground">Fade-out (s)
                      <Input type="number" min="0" max={getTrackDuration(selectedClip)} step="0.1" value={selectedClip.fadeOut} onChange={(event) => updateTrack(selectedClip.id, { fadeOut: Math.max(0, Math.min(getTrackDuration(selectedClip), Number(event.target.value))) })} className="mt-1 h-8" />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Cada música adicionada entra no fim da mesma linha. Corte as bordas para ajustar os trechos; os clipes seguintes acompanham o novo tamanho. As alterações são salvas automaticamente.
          </p>
        </section>
      </div>
        </TabsContent>
        <TabsContent value="master" className="px-4 py-6">
          {harmonyAssistant}
        </TabsContent>
      </Tabs>
    </main>
  );
}
