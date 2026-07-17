import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  X, Play, Pause, Square, Music, Type as TypeIcon, Keyboard,
} from 'lucide-react';
import { CeremonyStage } from '@/types/ceremony';
import { useUniversalAudioPlayer } from '@/hooks/useUniversalAudioPlayer';
import { useAllStageAudios } from '@/hooks/useStageAudios';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { parseRoteiro } from '@/lib/roteiroFormat';
import { toast } from 'sonner';

interface RoteiroReaderProps {
  titulo: string;
  conteudo: string;
  stages: CeremonyStage[];
  secaoNome: string;
  onClose: () => void;
}

export function RoteiroReader({ titulo, conteudo, stages, secaoNome, onClose }: RoteiroReaderProps) {
  const { audiosByStageId } = useAllStageAudios();
  const { audios: library } = useAudioLibrary();
  const { currentStageId, status, play, pause, resume, stop } = useUniversalAudioPlayer();

  const [fontSize, setFontSize] = useState(28);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [firedCues, setFiredCues] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const cueRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const stagesById = useMemo(() => {
    const m = new Map<string, CeremonyStage & { ordem: number }>();
    stages.forEach((s, i) => m.set(s.id, { ...s, ordem: i + 1 }));
    return m;
  }, [stages]);

  const libraryById = useMemo(() => {
    const m = new Map<string, typeof library[number]>();
    library.forEach((a) => m.set(a.id, a));
    return m;
  }, [library]);

  const blocks = useMemo(() => parseRoteiro(conteudo), [conteudo]);
  const cueBlocks = useMemo(
    () => blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.type === 'cue' || b.type === 'track'),
    [blocks],
  );

  const activeCueIdx = useMemo(() => {
    for (const { i } of cueBlocks) if (!firedCues.has(i)) return i;
    return -1;
  }, [cueBlocks, firedCues]);

  const resolveCue = useCallback((blockIndex: number): { id: string; url: string; name: string } | null => {
    const block = blocks[blockIndex];
    if (!block) return null;
    if (block.type === 'cue') {
      const stage = stagesById.get(block.etapaId);
      if (!stage) { toast.error('Etapa não encontrada — foi excluída?'); return null; }
      const audios = audiosByStageId[stage.id] || [];
      if (audios.length === 0) { toast.error(`"${stage.nome_simbolico}" não tem áudio`); return null; }
      return { id: stage.id, url: audios[0].audio_url, name: stage.nome_simbolico };
    }
    if (block.type === 'track') {
      const tr = libraryById.get(block.audioId);
      if (!tr) { toast.error('Faixa não encontrada — foi excluída?'); return null; }
      return { id: `track:${tr.id}`, url: tr.audio_url, name: tr.nome };
    }
    return null;
  }, [blocks, stagesById, libraryById, audiosByStageId]);

  const fireCue = useCallback((blockIndex: number) => {
    const resolved = resolveCue(blockIndex);
    if (!resolved) return;
    play(resolved.id, resolved.url);
    setFiredCues((s) => new Set(s).add(blockIndex));
    toast.success(`▶ ${resolved.name}`);
  }, [resolveCue, play]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (activeCueIdx >= 0) fireCue(activeCueIdx);
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        if (status === 'playing') pause();
        else if (status === 'paused') resume();
        return;
      }
      if (e.key === 's' || e.key === 'S') { stop(); return; }
      if (e.key === '+' || e.key === '=') { setFontSize((v) => Math.min(60, v + 2)); return; }
      if (e.key === '-' || e.key === '_') { setFontSize((v) => Math.max(16, v - 2)); return; }
      if (e.key === 'ArrowDown') scrollRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
      if (e.key === 'ArrowUp') scrollRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCueIdx, fireCue, onClose, pause, resume, stop, status]);

  useEffect(() => {
    if (activeCueIdx < 0) return;
    const el = cueRefs.current[activeCueIdx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeCueIdx]);

  const currentPlayingName = currentStageId
    ? (stagesById.get(currentStageId)?.nome_simbolico
        ?? (currentStageId.startsWith('track:') ? libraryById.get(currentStageId.slice(6))?.nome : null))
    : null;
  const nextCueEntry = cueBlocks.find(({ i }) => !firedCues.has(i));
  const nextCueName = nextCueEntry
    ? (() => {
        const b = blocks[nextCueEntry.i];
        if (b.type === 'cue') return stagesById.get(b.etapaId)?.nome_simbolico ?? null;
        if (b.type === 'track') return libraryById.get(b.audioId)?.nome ?? null;
        return null;
      })()
    : null;


  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a12] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/40">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-[hsl(var(--gold))]/70">{secaoNome}</div>
          <div className="text-lg font-semibold truncate">{titulo}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-white/70 text-sm px-2">
            <TypeIcon className="w-4 h-4" />
            <Slider
              value={[fontSize]}
              min={16}
              max={60}
              step={2}
              onValueChange={(v) => setFontSize(v[0])}
              className="w-24"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowShortcuts((s) => !s)}>
            <Keyboard className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Text scroller */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-8 md:px-24 py-24 scroll-smooth"
        >
          <div
            className="max-w-4xl mx-auto font-serif leading-relaxed text-white/90 whitespace-pre-wrap"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.55 }}
          >
            {blocks.length === 0 && (
              <div className="text-white/40 italic text-center">Roteiro vazio.</div>
            )}
            {blocks.map((b, i) => {
              if (b.type === 'text') return <span key={i}>{b.text}</span>;
              const stage = stagesById.get(b.etapaId);
              const fired = firedCues.has(i);
              const isActive = i === activeCueIdx;
              return (
                <button
                  key={i}
                  ref={(el) => (cueRefs.current[i] = el)}
                  onClick={() => fireCue(i)}
                  className={[
                    'inline-flex items-center gap-2 my-3 mx-1 px-4 py-2 rounded-lg border-2 align-middle transition-all',
                    fired
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                      : isActive
                        ? 'bg-[hsl(var(--gold))]/25 border-[hsl(var(--gold))] text-[hsl(var(--gold))] shadow-[0_0_24px_hsl(var(--gold)/0.4)] animate-pulse'
                        : 'bg-[hsl(var(--gold))]/10 border-[hsl(var(--gold))]/40 text-[hsl(var(--gold))]/80 hover:bg-[hsl(var(--gold))]/20',
                  ].join(' ')}
                  style={{ fontSize: `${Math.max(16, fontSize - 6)}px` }}
                >
                  <Music className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">
                    {stage ? `▶ ${stage.nome_simbolico}` : '⚠ etapa removida'}
                  </span>
                  {isActive && !fired && <span className="text-xs opacity-70">(ESPAÇO)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right rail */}
        <div className="w-72 border-l border-white/10 bg-black/40 p-4 hidden md:flex flex-col gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Tocando agora</div>
            {currentPlayingStage ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-400/30 px-3 py-2">
                <div className="text-sm font-semibold text-emerald-200 truncate">
                  {currentPlayingStage.nome_simbolico}
                </div>
                <div className="text-xs text-emerald-300/70">{status}</div>
              </div>
            ) : (
              <div className="text-xs text-white/40 italic">Nenhuma música tocando</div>
            )}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">A seguir</div>
            {nextStage ? (
              <div className="rounded-lg bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30 px-3 py-2">
                <div className="text-sm font-semibold text-[hsl(var(--gold))] truncate">
                  {nextStage.nome_simbolico}
                </div>
                <div className="text-xs text-[hsl(var(--gold))]/70">
                  {firedCues.size}/{cueBlocks.length} cues disparados
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/40 italic">Todos os cues foram disparados</div>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Button size="sm" variant="outline" onClick={() => setFiredCues(new Set())}>
              Reiniciar cues
            </Button>
            {status === 'playing' && (
              <Button size="sm" variant="outline" onClick={() => pause()}>
                <Pause className="w-4 h-4 mr-1" /> Pausar música
              </Button>
            )}
            {status === 'paused' && (
              <Button size="sm" variant="outline" onClick={() => resume()}>
                <Play className="w-4 h-4 mr-1" /> Retomar
              </Button>
            )}
            {(status === 'playing' || status === 'paused') && (
              <Button size="sm" variant="outline" onClick={() => stop()}>
                <Square className="w-4 h-4 mr-1" /> Parar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer with active cue hint */}
      <div className="border-t border-white/10 bg-black/60 px-6 py-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--gold))] animate-pulse" />
          <span className="text-white/70">
            {activeCueIdx >= 0 ? (
              <>Aperte <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[hsl(var(--gold))] font-semibold">ESPAÇO</kbd> ou clique no cue destacado</>
            ) : (
              'Nenhum cue pendente'
            )}
          </span>
        </div>
        <div className="text-xs text-white/40">ESC para sair</div>
      </div>

      {showShortcuts && (
        <div className="absolute right-4 top-16 bg-black/90 border border-white/20 rounded-lg p-4 text-xs space-y-1 shadow-xl z-10">
          <div className="text-[hsl(var(--gold))] font-semibold mb-2">Atalhos</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">ESPAÇO</kbd> disparar cue ativo</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">P</kbd> pausar/retomar</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">S</kbd> parar</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">↑ ↓</kbd> rolar texto</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">+ -</kbd> tamanho da fonte</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">ESC</kbd> sair</div>
        </div>
      )}
    </div>
  );
}
