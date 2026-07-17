import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  BookOpen, Music, Play, Pause, Save, Upload, FileText, Loader2, Sparkles, Square, Search, GripVertical, Library, Trash2,
} from 'lucide-react';

import { CeremonyStage } from '@/types/ceremony';
import { useRoteiros, useRoteiroBySection, Roteiro } from '@/hooks/useRoteiros';
import { insertCueAtCursor, insertTrackAtCursor, parseRoteiro } from '@/lib/roteiroFormat';
import { RoteiroImportDialog } from './RoteiroImportDialog';
import { RoteiroReader } from './RoteiroReader';
import { useUniversalAudioPlayer } from '@/hooks/useUniversalAudioPlayer';
import { useAllStageAudios } from '@/hooks/useStageAudios';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';

interface RoteiroEditorProps {
  secaoId: string;
  secaoNome: string;
  stages: CeremonyStage[];
}

type DragPayload =
  | { kind: 'stage'; id: string; name: string }
  | { kind: 'track'; id: string; name: string; url: string };

const DND_MIME = 'application/x-roteiro-item';
type LibrarySourceFilter = 'all' | 'file' | 'youtube' | 'spotify';

const getLibrarySource = (audio: { tipo: string | null; audio_url: string }) => {
  const tipo = (audio.tipo || '').toLowerCase();
  const url = (audio.audio_url || '').toLowerCase();
  if (tipo === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (tipo === 'spotify' || url.includes('open.spotify.com') || url.startsWith('spotify:')) return 'spotify';
  return 'file';
};

const getSourceLabel = (source: ReturnType<typeof getLibrarySource>) => {
  if (source === 'youtube') return 'YouTube';
  if (source === 'spotify') return 'Spotify';
  return 'Arquivo';
};

export function RoteiroEditor({ secaoId, secaoNome, stages }: RoteiroEditorProps) {
  const { data: roteiro } = useRoteiroBySection(secaoId);
  const { upsertRoteiro, deleteRoteiro, roteiros } = useRoteiros();
  const templates = roteiros.filter((r) => r.is_template);
  const { audiosByStageId } = useAllStageAudios();
  const { audios: library } = useAudioLibrary();
  const { play, pause, resume, stop, status, currentStageId } = useUniversalAudioPlayer();

  const [titulo, setTitulo] = useState('Roteiro da Seção');
  const [conteudo, setConteudo] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<'stages' | 'library'>('stages');
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySource, setLibrarySource] = useState<LibrarySourceFilter>('all');
  const [dropCursor, setDropCursor] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const playStage = (stageId: string, stageName: string) => {
    const audios = audiosByStageId[stageId] || [];
    if (audios.length === 0) {
      toast.error(`"${stageName}" não tem áudio`);
      return;
    }
    play(stageId, audios[0].audio_url);
    toast.success(`▶ ${stageName}`);
  };

  const playTrack = (id: string, name: string, url: string) => {
    play(`track:${id}`, url);
    toast.success(`▶ ${name}`);
  };

  useEffect(() => {
    if (roteiro) {
      setTitulo(roteiro.titulo || 'Roteiro da Seção');
      setConteudo(roteiro.conteudo || '');
      setDirty(false);
    }
  }, [roteiro?.id]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => handleSave(true), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteudo, titulo, dirty]);

  const handleChange = (v: string) => { setConteudo(v); setDirty(true); };

  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      await upsertRoteiro.mutateAsync({
        id: roteiro?.id,
        secao_id: secaoId,
        titulo,
        conteudo,
        is_template: false,
      });
      setDirty(false);
      if (!silent) toast.success('Roteiro salvo');
    } finally { setSaving(false); }
  };

  const focusAt = (pos: number) => {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const insertCue = (etapaId: string, atCursor?: number) => {
    const el = textareaRef.current;
    const cursor = atCursor ?? el?.selectionStart ?? conteudo.length;
    const { text, nextCursor } = insertCueAtCursor(conteudo, cursor, etapaId);
    setConteudo(text); setDirty(true); focusAt(nextCursor);
  };

  const insertTrack = (audioId: string, atCursor?: number) => {
    const el = textareaRef.current;
    const cursor = atCursor ?? el?.selectionStart ?? conteudo.length;
    const { text, nextCursor } = insertTrackAtCursor(conteudo, cursor, audioId);
    setConteudo(text); setDirty(true); focusAt(nextCursor);
  };

  // Drag & drop --------------------------------------------------------------
  const handleDragStart = (e: React.DragEvent, payload: DragPayload) => {
    e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
    e.dataTransfer.setData('text/plain', payload.name);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const cursorFromEvent = (e: React.DragEvent<HTMLTextAreaElement>): number => {
    const el = textareaRef.current;
    if (!el) return conteudo.length;
    // Durante o dragover o browser move o caret do textarea para o ponto do mouse.
    // Focar + ler selectionStart é o método mais confiável cross-browser.
    try { el.focus({ preventScroll: true } as any); } catch { el.focus(); }
    const anyDoc = document as any;
    try {
      if (anyDoc.caretPositionFromPoint) {
        const pos = anyDoc.caretPositionFromPoint(e.clientX, e.clientY);
        if (pos && typeof pos.offset === 'number' && pos.offset > 0) return pos.offset;
      } else if (anyDoc.caretRangeFromPoint) {
        const r = anyDoc.caretRangeFromPoint(e.clientX, e.clientY);
        if (r && r.startOffset > 0) return r.startOffset;
      }
    } catch { /* noop */ }
    return el.selectionStart ?? conteudo.length;
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (!e.dataTransfer.types.includes(DND_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropCursor(cursorFromEvent(e));
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const raw = e.dataTransfer.getData(DND_MIME);
    if (!raw) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = cursorFromEvent(e);
    setDropCursor(null);
    try {
      const p = JSON.parse(raw) as DragPayload;
      if (p.kind === 'stage') insertCue(p.id, pos);
      else insertTrack(p.id, pos);
      toast.success(`Cue inserido: ${p.name}`);
    } catch { /* noop */ }
  };

  const importText = (text: string, replace: boolean) => {
    setConteudo(replace ? text : conteudo + (conteudo ? '\n\n' : '') + text);
    setDirty(true);
  };

  const saveAsTemplate = async () => {
    if (!conteudo.trim()) { toast.error('Nada para salvar como template'); return; }
    await upsertRoteiro.mutateAsync({
      titulo: `${titulo} (template)`, conteudo, is_template: true, secao_id: null,
    });
    toast.success('Salvo como template na biblioteca');
  };

  const loadTemplate = (t: Roteiro) => {
    setConteudo((prev) => prev + (prev ? '\n\n' : '') + t.conteudo);
    setDirty(true);
    toast.success(`Template "${t.titulo}" inserido`);
  };

  const parsed = parseRoteiro(conteudo);
  const cueCount = parsed.filter((b) => b.type === 'cue' || b.type === 'track').length;

  const filteredLibrary = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    return library.filter((a) => {
      const source = getLibrarySource(a);
      if (librarySource !== 'all' && source !== librarySource) return false;
      if (!q) return true;
      return [a.nome, a.audio_url, a.tipo || '', getSourceLabel(source)]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [library, librarySearch, librarySource]);

  const libraryCounts = useMemo(() => {
    return library.reduce<Record<LibrarySourceFilter, number>>((acc, audio) => {
      acc.all += 1;
      acc[getLibrarySource(audio)] += 1;
      return acc;
    }, { all: 0, file: 0, youtube: 0, spotify: 0 });
  }, [library]);

  const libraryById = useMemo(() => {
    const m = new Map<string, typeof library[number]>();
    library.forEach((a) => m.set(a.id, a));
    return m;
  }, [library]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <BookOpen className="w-5 h-5 text-[hsl(var(--gold))]" />
          <Input
            value={titulo}
            onChange={(e) => { setTitulo(e.target.value); setDirty(true); }}
            className="text-lg font-semibold bg-transparent border-b border-white/10 border-x-0 border-t-0 rounded-none focus-visible:ring-0 px-0 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-1" /> Importar
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={templates.length === 0}>
                <FileText className="w-4 h-4 mr-1" /> Templates
              </Button>
            </PopoverTrigger>
              <PopoverContent className="w-80 p-2" align="end">
              <div className="text-xs text-white/60 mb-2 px-2">
                {templates.length === 0 ? 'Nenhum template salvo' : 'Clique para inserir'}
              </div>
              <ScrollArea className="max-h-64">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded hover:bg-white/5 p-1">
                    <button onClick={() => loadTemplate(t)}
                      className="flex-1 text-left px-2 py-1.5 text-sm truncate min-w-0">
                      {t.titulo}
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Excluir template "${t.titulo}"?`)) {
                          deleteRoteiro.mutate(t.id);
                        }
                      }}
                      className="h-8 shrink-0 px-2"
                      title="Excluir template"
                      aria-label="Excluir template"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" onClick={saveAsTemplate}>
            <Sparkles className="w-4 h-4 mr-1" /> Salvar como template
          </Button>
          <Button size="sm" onClick={() => handleSave(false)} disabled={saving || !dirty}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            {dirty ? 'Salvar' : 'Salvo'}
          </Button>
          <Button size="sm" onClick={() => setShowReader(true)}
            className="bg-[hsl(var(--gold))]/20 border border-[hsl(var(--gold))]/40 text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/30">
            <Play className="w-4 h-4 mr-1" /> Iniciar Leitura
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={conteudo}
              onChange={(e) => handleChange(e.target.value)}
              onDragOver={handleDragOver}
              onDragLeave={() => setDropCursor(null)}
              onDrop={handleDrop}
              placeholder={`Cole aqui o texto do ritual. Arraste etapas ou faixas da lateral para o ponto exato em que devem tocar.\n\nExemplo:\n\n"O Venerável Mestre declara abertos os trabalhos..."\n\n[[CUE:etapa-de-abertura]]`}
              className={[
                'min-h-[500px] font-serif text-base leading-relaxed bg-black/20 border-white/10 focus-visible:ring-[hsl(var(--gold))]/40 transition-shadow',
                dropCursor !== null ? 'ring-2 ring-[hsl(var(--gold))]/60 shadow-[0_0_0_4px_hsl(var(--gold)/0.15)]' : '',
              ].join(' ')}
            />
            {dropCursor !== null && (
              <div className="absolute top-2 right-2 text-[10px] uppercase tracking-widest text-[hsl(var(--gold))] bg-black/70 px-2 py-1 rounded">
                soltar para inserir cue
              </div>
            )}
          </div>
          <div className="text-xs text-white/50 flex items-center gap-4">
            <span>{conteudo.length} caracteres</span>
            <span>•</span>
            <span>{cueCount} cue{cueCount === 1 ? '' : 's'} musical{cueCount === 1 ? '' : 'is'}</span>
            {dirty && <span className="text-[hsl(var(--gold))]">• alterações não salvas</span>}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-3 md:sticky md:top-4 h-fit space-y-3">
          {(status === 'playing' || status === 'paused') && (
            <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-2">
              <div className="text-[10px] uppercase tracking-widest text-emerald-300/70 mb-1">Tocando agora</div>
              <div className="text-xs text-emerald-200 truncate mb-2">
                {stages.find((s) => s.id === currentStageId)?.nome_simbolico
                  || (currentStageId?.startsWith('track:') && libraryById.get(currentStageId.slice(6))?.nome)
                  || 'Áudio ativo'}
              </div>
              <div className="flex gap-1">
                {status === 'playing' ? (
                  <Button size="sm" variant="outline" className="flex-1 h-7" onClick={() => pause()}>
                    <Pause className="w-3 h-3 mr-1" /> Pausar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="flex-1 h-7" onClick={() => resume()}>
                    <Play className="w-3 h-3 mr-1" /> Retomar
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7" onClick={() => stop()}>
                  <Square className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-black/40 border border-white/10">
            <button
              onClick={() => setTab('stages')}
              className={`text-xs py-1.5 rounded flex items-center justify-center gap-1 ${tab === 'stages' ? 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]' : 'text-white/60 hover:text-white/90'}`}>
              <Music className="w-3 h-3" /> Etapas ({stages.length})
            </button>
            <button
              onClick={() => setTab('library')}
              className={`text-xs py-1.5 rounded flex items-center justify-center gap-1 ${tab === 'library' ? 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]' : 'text-white/60 hover:text-white/90'}`}>
              <Library className="w-3 h-3" /> Biblioteca ({library.length})
            </button>
          </div>

          <div className="text-[11px] text-white/50">
            <span className="text-[hsl(var(--gold))]">Arraste</span> para o texto · clique no nome para inserir no cursor · <span className="text-emerald-400">▶</span> testa o áudio.
          </div>

          {tab === 'stages' ? (
            <ScrollArea className="max-h-[420px]">
              <div className="space-y-1">
                {stages.length === 0 && (
                  <div className="text-xs text-white/40 italic">Nenhuma etapa criada nesta seção.</div>
                )}
                {stages.map((s, i) => {
                  const hasAudio = (audiosByStageId[s.id] || []).length > 0;
                  const isPlayingThis = currentStageId === s.id && (status === 'playing' || status === 'paused');
                  return (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, { kind: 'stage', id: s.id, name: s.nome_simbolico })}
                      className={[
                        'group flex items-center gap-1 rounded border transition-all text-sm cursor-grab active:cursor-grabbing',
                        isPlayingThis
                          ? 'border-emerald-400/50 bg-emerald-500/10'
                          : 'border-transparent hover:border-[hsl(var(--gold))]/40 hover:bg-[hsl(var(--gold))]/10',
                      ].join(' ')}
                    >
                      <GripVertical className="w-3 h-3 text-white/30 group-hover:text-[hsl(var(--gold))] shrink-0 ml-1" />
                      <button onClick={() => insertCue(s.id)}
                        className="flex-1 flex items-center gap-2 text-left px-1 py-2 min-w-0"
                        title="Inserir cue no texto">
                        <span className="w-6 h-6 rounded-full bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate">{s.nome_simbolico}</span>
                      </button>
                      <button onClick={() => playStage(s.id, s.nome_simbolico)}
                        disabled={!hasAudio}
                        className={[
                          'h-8 w-8 rounded flex items-center justify-center shrink-0 transition-colors',
                          hasAudio ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-white/20 cursor-not-allowed',
                        ].join(' ')}
                        title={hasAudio ? 'Tocar áudio da etapa' : 'Sem áudio configurado'}>
                        <Play className="w-4 h-4" fill="currentColor" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
                <Input
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Buscar música..."
                  className="h-8 pl-7 text-xs bg-black/30 border-white/10"
                />
              </div>
              <div className="grid grid-cols-4 gap-1">
                {([
                  ['all', 'Todas', libraryCounts.all],
                  ['file', 'Arquivo', libraryCounts.file],
                  ['youtube', 'YouTube', libraryCounts.youtube],
                  ['spotify', 'Spotify', libraryCounts.spotify],
                ] as const).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLibrarySource(value)}
                    className={`rounded border px-1.5 py-1 text-[10px] leading-tight transition-colors ${librarySource === value
                      ? 'border-[hsl(var(--gold))]/50 bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]'
                      : 'border-white/10 bg-black/20 text-white/60 hover:text-white/90'}`}
                  >
                    <span className="block truncate">{label}</span>
                    <span className="block text-[9px] opacity-75">{count}</span>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-white/45 px-1">
                Mostrando {filteredLibrary.length} de {library.length} músicas.
              </div>
              <ScrollArea className="max-h-[380px]">
                <div className="space-y-1">
                  {filteredLibrary.length === 0 && (
                    <div className="text-xs text-white/40 italic px-1 py-2">
                      {library.length === 0 ? 'Biblioteca vazia.' : 'Nenhum resultado.'}
                    </div>
                  )}
                  {filteredLibrary.map((a) => {
                    const isPlayingThis = currentStageId === `track:${a.id}` && (status === 'playing' || status === 'paused');
                    const source = getLibrarySource(a);
                    return (
                      <div key={a.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, { kind: 'track', id: a.id, name: a.nome, url: a.audio_url })}
                        className={[
                          'group flex items-center gap-1 rounded border transition-all text-sm cursor-grab active:cursor-grabbing',
                          isPlayingThis
                            ? 'border-emerald-400/50 bg-emerald-500/10'
                            : 'border-transparent hover:border-[hsl(var(--gold))]/40 hover:bg-[hsl(var(--gold))]/10',
                        ].join(' ')}
                      >
                        <GripVertical className="w-3 h-3 text-white/30 group-hover:text-[hsl(var(--gold))] shrink-0 ml-1" />
                        <button onClick={() => insertTrack(a.id)}
                          className="flex-1 text-left px-1 py-2 min-w-0"
                          title="Inserir cue de faixa no cursor">
                          <span className="block truncate">{a.nome}</span>
                          <span className="text-[10px] text-white/45">{getSourceLabel(source)}</span>
                        </button>
                        <button onClick={() => playTrack(a.id, a.nome, a.audio_url)}
                          className="h-8 w-8 rounded flex items-center justify-center shrink-0 text-emerald-400 hover:bg-emerald-500/20"
                          title="Tocar faixa">
                          <Play className="w-4 h-4" fill="currentColor" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {cueCount > 0 && (
            <div className="pt-2 border-t border-white/10">
              <div className="text-xs uppercase tracking-wider text-white/60 mb-2 flex items-center gap-1">
                <Play className="w-3 h-3" /> Cues no roteiro ({cueCount})
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {parsed.map((b, i) => ({ b, i }))
                    .filter(({ b }) => b.type !== 'text')
                    .map(({ b, i }, idx) => {
                      let label = '';
                      let onPlay: (() => void) | null = null;
                      if (b.type === 'cue') {
                        const stage = stages.find((s) => s.id === b.etapaId);
                        label = stage?.nome_simbolico ?? 'etapa removida';
                        if (stage && (audiosByStageId[stage.id] || []).length > 0) {
                          onPlay = () => playStage(stage.id, stage.nome_simbolico);
                        }
                      } else if (b.type === 'track') {
                        const tr = libraryById.get(b.audioId);
                        label = tr?.nome ?? 'faixa removida';
                        if (tr) onPlay = () => playTrack(tr.id, tr.nome, tr.audio_url);
                      }
                      return (
                        <div key={i} className="flex items-center gap-1 px-2 py-1.5 rounded bg-black/30 border border-white/5 text-xs">
                          <span className="w-5 h-5 rounded-full bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] flex items-center justify-center text-[10px] font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate flex-1">
                            {onPlay ? label : <span className="text-red-400 italic">{label}</span>}
                          </span>
                          {onPlay && (
                            <button onClick={onPlay}
                              className="h-6 w-6 rounded flex items-center justify-center shrink-0 text-emerald-400 hover:bg-emerald-500/20"
                              title="Tocar">
                              <Play className="w-3 h-3" fill="currentColor" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      <RoteiroImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={importText}
        hasContent={conteudo.trim().length > 0}
      />

      {showReader && (
        <RoteiroReader
          titulo={titulo}
          conteudo={conteudo}
          stages={stages}
          secaoNome={secaoNome}
          onClose={() => setShowReader(false)}
        />
      )}
    </div>
  );
}
