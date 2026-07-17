import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  X, Play, Pause, Square, Music, Type as TypeIcon, Keyboard,
  ChevronLeft, ChevronRight, BookOpen, List,
} from 'lucide-react';
import { CeremonyStage } from '@/types/ceremony';
import { useUniversalAudioPlayer } from '@/hooks/useUniversalAudioPlayer';
import { useAllStageAudios } from '@/hooks/useStageAudios';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { parseRoteiro, paginateBlocks, RoteiroBlock } from '@/lib/roteiroFormat';
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
  const [showIndex, setShowIndex] = useState(false);
  const [firedCues, setFiredCues] = useState<Set<string>>(new Set());
  const [pageIndex, setPageIndex] = useState(0);
  const [gotoValue, setGotoValue] = useState('');
  const pageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

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
  const autoCharsPerPage = Math.max(600, Math.round(2400 - fontSize * 30));
  const pages = useMemo(() => paginateBlocks(blocks, autoCharsPerPage), [blocks, autoCharsPerPage]);
  const totalPages = Math.max(1, pages.length);

  useEffect(() => {
    if (pageIndex >= totalPages) setPageIndex(totalPages - 1);
  }, [pageIndex, totalPages]);

  const currentPage = pages[pageIndex] || [];

  // Chave estável para cada cue (por índice de página + posição)
  const cueKey = (pIdx: number, bIdx: number) => `${pIdx}:${bIdx}`;

  const pageCues = useMemo(
    () => currentPage
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.type === 'cue' || b.type === 'track'),
    [currentPage],
  );

  const activeCueBlockIdx = useMemo(() => {
    for (const { i } of pageCues) {
      if (!firedCues.has(cueKey(pageIndex, i))) return i;
    }
    return -1;
  }, [pageCues, firedCues, pageIndex]);

  // Índice de páginas com labels
  const pageSummaries = useMemo(() => {
    return pages.map((pg, idx) => {
      const firstText = pg.find((b) => b.type === 'text') as Extract<RoteiroBlock, { type: 'text' }> | undefined;
      const cueCount = pg.filter((b) => b.type === 'cue' || b.type === 'track').length;
      const preview = (firstText?.text || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      return { idx, preview: preview || '(sem texto)', cueCount };
    });
  }, [pages]);

  const resolveCue = useCallback((block: RoteiroBlock): { id: string; url: string; name: string } | null => {
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
  }, [stagesById, libraryById, audiosByStageId]);

  const fireCue = useCallback((bIdx: number) => {
    const block = currentPage[bIdx];
    if (!block || (block.type !== 'cue' && block.type !== 'track')) return;
    const resolved = resolveCue(block);
    if (!resolved) return;
    play(resolved.id, resolved.url);
    setFiredCues((s) => new Set(s).add(cueKey(pageIndex, bIdx)));
    toast.success(`▶ ${resolved.name}`);
  }, [currentPage, resolveCue, play, pageIndex]);

  const goPrev = useCallback(() => setPageIndex((p) => Math.max(0, p - 1)), []);
  const goNext = useCallback(() => setPageIndex((p) => Math.min(totalPages - 1, p + 1)), [totalPages]);
  const goTo = (n: number) => setPageIndex(Math.max(0, Math.min(totalPages - 1, n - 1)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === 'Escape') { onClose(); return; }
      if (typing) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (activeCueBlockIdx >= 0) fireCue(activeCueBlockIdx);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goNext(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goPrev(); return; }
      if (e.key === 'Home') { e.preventDefault(); setPageIndex(0); return; }
      if (e.key === 'End') { e.preventDefault(); setPageIndex(totalPages - 1); return; }
      if (e.key === 'p' || e.key === 'P') {
        if (status === 'playing') pause(); else if (status === 'paused') resume();
        return;
      }
      if (e.key === 's' || e.key === 'S') { stop(); return; }
      if (e.key === '+' || e.key === '=') { setFontSize((v) => Math.min(60, v + 2)); return; }
      if (e.key === '-' || e.key === '_') { setFontSize((v) => Math.max(16, v - 2)); return; }
      if (e.key === 'ArrowDown') pageRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
      if (e.key === 'ArrowUp') pageRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCueBlockIdx, fireCue, onClose, pause, resume, stop, status, goNext, goPrev, totalPages]);

  // reset scroll ao virar página
  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 });
  }, [pageIndex]);

  // swipe mobile
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) goNext(); else goPrev();
  };

  const currentPlayingName = currentStageId
    ? (stagesById.get(currentStageId)?.nome_simbolico
        ?? (currentStageId.startsWith('track:') ? libraryById.get(currentStageId.slice(6))?.nome : null))
    : null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a12] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 bg-black/40 gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-widest text-[hsl(var(--gold))]/70 truncate">{secaoNome}</div>
          <div className="text-lg font-semibold truncate">{titulo}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1 text-white/70 text-sm px-2">
            <TypeIcon className="w-4 h-4" />
            <Slider
              value={[fontSize]} min={16} max={60} step={2}
              onValueChange={(v) => setFontSize(v[0])} className="w-24"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowIndex((s) => !s)} title="Índice de páginas">
            <List className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowShortcuts((s) => !s)} title="Atalhos">
            <Keyboard className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Índice lateral */}
        {showIndex && (
          <aside className="w-64 border-r border-white/10 bg-black/50 overflow-y-auto shrink-0">
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-white/50 border-b border-white/10 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Páginas ({totalPages})
            </div>
            <div className="p-2 space-y-1">
              {pageSummaries.map((p) => (
                <button
                  key={p.idx}
                  onClick={() => setPageIndex(p.idx)}
                  className={[
                    'w-full text-left rounded-md px-2 py-2 text-xs transition-colors border',
                    p.idx === pageIndex
                      ? 'bg-[hsl(var(--gold))]/20 border-[hsl(var(--gold))]/50 text-[hsl(var(--gold))]'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono opacity-70">pág. {p.idx + 1}</span>
                    {p.cueCount > 0 && (
                      <span className="text-[10px] px-1.5 rounded bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]">
                        {p.cueCount} ♪
                      </span>
                    )}
                  </div>
                  <div className="line-clamp-2 opacity-80">{p.preview}</div>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Page (book) */}
        <div
          className="flex-1 relative flex items-stretch"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Prev arrow */}
          <button
            onClick={goPrev}
            disabled={pageIndex === 0}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 md:w-16 flex items-center justify-center text-white/40 hover:text-[hsl(var(--gold))] hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div
            ref={pageRef}
            className="flex-1 overflow-y-auto px-16 md:px-28 py-14 md:py-20 scroll-smooth"
          >
            <div
              className="max-w-3xl mx-auto min-h-full font-serif leading-relaxed text-white/90 whitespace-pre-wrap relative"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.55 }}
            >
              {/* Page number watermark */}
              <div className="absolute -top-8 right-0 text-xs font-mono text-white/30 tracking-widest">
                {pageIndex + 1} / {totalPages}
              </div>

              {currentPage.length === 0 && (
                <div className="text-white/40 italic text-center">Página vazia.</div>
              )}

              {currentPage.map((b, i) => {
                if (b.type === 'text') return <span key={i}>{b.text}</span>;
                if (b.type === 'page') return null;
                const isTrack = b.type === 'track';
                const label = b.type === 'cue'
                  ? (stagesById.get(b.etapaId)?.nome_simbolico ?? null)
                  : (libraryById.get(b.audioId)?.nome ?? null);
                const fired = firedCues.has(cueKey(pageIndex, i));
                const isActive = i === activeCueBlockIdx;
                return (
                  <button
                    key={i}
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
                      {label ? `▶ ${label}` : (isTrack ? '⚠ faixa removida' : '⚠ etapa removida')}
                    </span>
                    {isActive && !fired && <span className="text-xs opacity-70">(ESPAÇO)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next arrow */}
          <button
            onClick={goNext}
            disabled={pageIndex >= totalPages - 1}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 md:w-16 flex items-center justify-center text-white/40 hover:text-[hsl(var(--gold))] hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
            aria-label="Próxima página"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* Footer com navegação e status */}
      <div className="border-t border-white/10 bg-black/60 px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={goPrev} disabled={pageIndex === 0} className="h-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-white/70 font-mono text-xs">
            pág. <strong className="text-[hsl(var(--gold))]">{pageIndex + 1}</strong> / {totalPages}
          </span>
          <Button size="sm" variant="outline" onClick={goNext} disabled={pageIndex >= totalPages - 1} className="h-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <form
            className="flex items-center gap-1 ml-2"
            onSubmit={(e) => { e.preventDefault(); const n = parseInt(gotoValue, 10); if (!Number.isNaN(n)) goTo(n); setGotoValue(''); }}
          >
            <Input
              value={gotoValue}
              onChange={(e) => setGotoValue(e.target.value.replace(/\D/g, ''))}
              placeholder="ir p/"
              className="h-8 w-16 text-xs bg-white/5 border-white/10"
            />
            <Button type="submit" size="sm" variant="outline" className="h-8">Ir</Button>
          </form>
        </div>

        <div className="flex items-center gap-3">
          {currentPlayingName && (
            <span className="text-emerald-300/80 text-xs truncate max-w-[220px]">
              ♪ {currentPlayingName}
            </span>
          )}
          {status === 'playing' && (
            <Button size="sm" variant="outline" onClick={() => pause()} className="h-8"><Pause className="w-4 h-4" /></Button>
          )}
          {status === 'paused' && (
            <Button size="sm" variant="outline" onClick={() => resume()} className="h-8"><Play className="w-4 h-4" /></Button>
          )}
          {(status === 'playing' || status === 'paused') && (
            <Button size="sm" variant="outline" onClick={() => stop()} className="h-8"><Square className="w-4 h-4" /></Button>
          )}
          <span className="text-xs text-white/40 hidden md:inline">
            ← → viram páginas • ESPAÇO dispara cue • ESC sai
          </span>
        </div>
      </div>

      {showShortcuts && (
        <div className="absolute right-4 top-16 bg-black/90 border border-white/20 rounded-lg p-4 text-xs space-y-1 shadow-xl z-20">
          <div className="text-[hsl(var(--gold))] font-semibold mb-2">Atalhos</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">←</kbd> / <kbd className="bg-white/10 px-1.5 rounded">→</kbd> virar página</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">PageUp</kbd> / <kbd className="bg-white/10 px-1.5 rounded">PageDown</kbd> virar página</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">Home</kbd> / <kbd className="bg-white/10 px-1.5 rounded">End</kbd> primeira/última</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">ESPAÇO</kbd> disparar cue ativo</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">P</kbd> pausar/retomar</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">S</kbd> parar</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">↑ ↓</kbd> rolar dentro da página</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">+ -</kbd> tamanho da fonte</div>
          <div><kbd className="bg-white/10 px-1.5 rounded">ESC</kbd> sair</div>
        </div>
      )}
    </div>
  );
}
