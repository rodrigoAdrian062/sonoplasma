import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, Plus, X, Volume2, Zap, Search, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { toast } from 'sonner';
import { getYouTubeVideoId } from '@/lib/embedUrl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STORAGE_KEY = 'sonoplastia:quickSounds';
const VOLUME_KEY = 'sonoplastia:quickSoundsVolume';
const MAX_SLOTS = 10;

export interface QuickSound {
  id: string;
  nome: string;
  url: string;
}

function loadSounds(): QuickSound[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SLOTS) : [];
  } catch {
    return [];
  }
}

/** Formatos que o navegador não reproduz (ex.: WMA). */
function isUnsupportedFormat(url: string): boolean {
  const clean = (url || '').split('?')[0].toLowerCase();
  return /\.(wma|wmv|asf|ra|rm|aiff?)$/.test(clean);
}

function loadVolume(): number {
  const raw = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.7;
}

/** Sons rápidos (soundboard) — atalhos de play para efeitos curtos. */
export function QuickSoundsPanel({ compact = false, fullHeight = false }: { compact?: boolean; fullHeight?: boolean }) {
  const { audios } = useAudioLibrary();
  const [sounds, setSounds] = useState<QuickSound[]>(loadSounds);
  const [volume, setVolume] = useState<number>(loadVolume);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sounds));
  }, [sounds]);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
  };

  const trigger = (sound: QuickSound) => {
    if (playingId === sound.id) {
      stop();
      return;
    }
    stop();
    if (isUnsupportedFormat(sound.url)) {
      toast.error('Formato não suportado pelo navegador (WMA). Use MP3, M4A, OGG ou WAV.');
      return;
    }
    const el = audioRef.current && !audioRef.current.src ? audioRef.current : new Audio();
    el.preload = 'auto';
    el.src = sound.url;
    el.volume = volume;
    el.onended = () => setPlayingId((cur) => (cur === sound.id ? null : cur));
    el.onerror = () => {
      setPlayingId((cur) => (cur === sound.id ? null : cur));
      toast.error(`Não foi possível tocar "${sound.nome}". Verifique o formato do arquivo.`);
    };
    audioRef.current = el;
    setPlayingId(sound.id);
    el.play().catch((err) => {
      setPlayingId(null);
      toast.error(`Falha ao tocar "${sound.nome}": ${err?.message || 'erro desconhecido'}`);
    });
  };

  const addSound = (nome: string, url: string) => {
    setSounds((prev) => {
      if (prev.length >= MAX_SLOTS || prev.some((s) => s.url === url)) return prev;
      return [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, nome, url }];
    });
  };

  const renameSound = (id: string, nome: string) => {
    setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, nome } : s)));
  };

  const removeSound = (id: string) => {
    setSounds((prev) => prev.filter((s) => s.id !== id));
    if (playingId === id) stop();
  };

  const playableAudios = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (audios || [])
      .filter((a) => a.audio_url && !getYouTubeVideoId(a.audio_url) && !a.audio_url.includes('spotify'))
      .filter((a) => !isUnsupportedFormat(a.audio_url!))
      .filter((a) => (term ? (a.nome || '').toLowerCase().includes(term) : true))
      .slice(0, 60);
  }, [audios, search]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    setVolume((v) => Math.min(1, Math.max(0, Math.round((v + delta) * 100) / 100)));
  };

  const picker = (
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogContent className="bg-card border-gold/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gold">
            <Zap size={18} /> Adicionar som rápido
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar na biblioteca..."
            className="pl-9"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto scrollbar-thin space-y-1 pr-1">
          {playableAudios.length === 0 && (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Nenhum áudio compatível encontrado (arquivos WMA e links do YouTube/Spotify não podem ser usados como som rápido).
            </p>
          )}
          {playableAudios.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                addSound(a.nome, a.audio_url!);
                setPickerOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg border border-border/60 hover:border-gold/40 hover:bg-gold/5 transition-colors text-sm text-foreground truncate"
            >
              {a.nome}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Máximo de {MAX_SLOTS} atalhos. Apenas áudios de arquivo podem ser usados como som rápido.
        </p>
      </DialogContent>
    </Dialog>
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-2 bg-card/80 backdrop-blur-md border border-gold/30 rounded-2xl p-2 shadow-xl shadow-black/40 max-w-[164px]">
        <span className="text-[9px] uppercase tracking-[0.18em] text-gold/70 font-bold text-center">Sons rápidos</span>
        <div className="grid grid-cols-2 gap-1.5">
          {sounds.map((s) => (
            <button
              key={s.id}
              onClick={() => trigger(s)}
              title={s.nome}
              className={cn(
                'flex items-center justify-center gap-1 h-9 rounded-lg border text-[10px] font-medium truncate px-1 transition-all',
                playingId === s.id
                  ? 'bg-gold text-background border-gold'
                  : 'bg-black/40 text-foreground border-gold/20 hover:border-gold/50'
              )}
            >
              {playingId === s.id ? <Square size={10} /> : <Play size={10} />}
              <span className="truncate">{s.nome}</span>
            </button>
          ))}
          {sounds.length < MAX_SLOTS && (
            <button
              onClick={() => setPickerOpen(true)}
              className="h-9 rounded-lg border border-dashed border-gold/30 text-gold/70 flex items-center justify-center hover:bg-gold/10"
            >
              <Plus size={12} />
            </button>
          )}
        </div>
        {picker}
      </div>
    );
  }

  return (
    <div
      onWheel={handleWheel}
      className={cn(
        'flex flex-col gap-3 bg-card/70 backdrop-blur-md border-gold/20 shadow-2xl shadow-black/40',
        fullHeight
          ? 'w-full h-full border-r px-4 py-5 overflow-y-auto scrollbar-thin'
          : 'w-[184px] border rounded-3xl px-4 py-5'
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <Zap size={16} className="text-gold" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-gold/70 font-bold text-center">
          Sons Rápidos
        </span>
      </div>

      <div className="w-full h-px bg-gold/20" />

      <div className={cn('flex flex-col gap-1.5', fullHeight && 'flex-1')}>
        {sounds.length === 0 && (
          <p className="text-[9px] text-muted-foreground text-center leading-tight py-2">
            Adicione atalhos para tocar efeitos curtos com um clique.
          </p>
        )}
        {sounds.map((s, i) => (
          <div key={s.id} className="group relative">
            {editingId === s.id ? (
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameSound(s.id, editingName.trim() || s.nome);
                      setEditingId(null);
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="h-8 text-[11px] px-2"
                />
                <button
                  onClick={() => {
                    renameSound(s.id, editingName.trim() || s.nome);
                    setEditingId(null);
                  }}
                  className="h-8 w-7 rounded-lg bg-gold/20 text-gold flex items-center justify-center"
                  title="Salvar nome"
                >
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => trigger(s)}
                  title={s.nome}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 rounded-xl border text-left transition-all',
                    fullHeight ? 'py-3' : 'py-2',
                    playingId === s.id
                      ? 'bg-gold text-background border-gold shadow-lg shadow-gold/20'
                      : 'bg-black/40 text-foreground border-gold/20 hover:border-gold/50 hover:bg-gold/5'
                  )}
                >
                  <span className="text-[9px] font-bold opacity-60 shrink-0">{i + 1}</span>
                  {playingId === s.id ? <Square size={12} className="shrink-0" /> : <Play size={12} className="shrink-0" />}
                  <span className={cn('font-medium truncate', fullHeight ? 'text-xs' : 'text-[11px]')}>{s.nome}</span>
                </button>
                <div className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(s.id); setEditingName(s.nome); }}
                    className="h-4 w-4 rounded-full bg-gold text-background flex items-center justify-center"
                    title="Editar nome do botão"
                  >
                    <Pencil size={8} />
                  </button>
                  <button
                    onClick={() => removeSound(s.id)}
                    className="h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    title="Remover atalho"
                  >
                    <X size={9} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {sounds.length < MAX_SLOTS && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
          className="h-8 border-gold/30 text-gold hover:bg-gold/10 text-[10px]"
        >
          <Plus size={12} className="mr-1" /> Atalho
        </Button>
      )}

      <div className="w-full h-px bg-gold/20" />

      <div className="flex items-center gap-2">
        <Volume2 size={12} className="text-gold/70 shrink-0" />
        <Slider
          value={[Math.round(volume * 100)]}
          max={100}
          step={1}
          onValueChange={([v]) => setVolume(v / 100)}
          className="flex-1"
        />
        <span className="text-[9px] text-gold/70 w-7 text-right">{Math.round(volume * 100)}%</span>
      </div>

      {playingId && (
        <Button variant="outline" size="sm" onClick={stop} className="h-7 text-[10px] border-gold/30">
          <Square size={10} className="mr-1" /> Parar som
        </Button>
      )}

      {picker}
    </div>
  );
}
