import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  BookOpen, Music, Play, Save, Upload, FileText, Loader2, Plus, Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CeremonyStage } from '@/types/ceremony';
import { useRoteiros, useRoteiroBySection, Roteiro } from '@/hooks/useRoteiros';
import { insertCueAtCursor, parseRoteiro } from '@/lib/roteiroFormat';
import { RoteiroImportDialog } from './RoteiroImportDialog';
import { RoteiroReader } from './RoteiroReader';
import { useUniversalAudioPlayer } from '@/hooks/useUniversalAudioPlayer';
import { useAllStageAudios } from '@/hooks/useStageAudios';
import { Square } from 'lucide-react';


interface RoteiroEditorProps {
  secaoId: string;
  secaoNome: string;
  stages: CeremonyStage[];
}

export function RoteiroEditor({ secaoId, secaoNome, stages }: RoteiroEditorProps) {
  const { data: roteiro } = useRoteiroBySection(secaoId);
  const { upsertRoteiro, roteiros } = useRoteiros();
  const templates = roteiros.filter((r) => r.is_template);
  const { audiosByStageId } = useAllStageAudios();
  const { play, pause, resume, stop, status, currentStageId } = useUniversalAudioPlayer();

  const [titulo, setTitulo] = useState('Roteiro da Seção');
  const [conteudo, setConteudo] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef(0);

  const playStage = (stageId: string, stageName: string) => {
    const audios = audiosByStageId[stageId] || [];
    if (audios.length === 0) {
      toast.error(`"${stageName}" não tem áudio`);
      return;
    }
    play(stageId, audios[0].audio_url);
    toast.success(`▶ ${stageName}`);
  };


  useEffect(() => {
    if (roteiro) {
      setTitulo(roteiro.titulo || 'Roteiro da Seção');
      setConteudo(roteiro.conteudo || '');
      setDirty(false);
    }
  }, [roteiro?.id]);

  // Auto-save debounced
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => handleSave(true), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteudo, titulo, dirty]);

  const handleChange = (v: string) => {
    setConteudo(v);
    setDirty(true);
  };

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
    } finally {
      setSaving(false);
    }
  };

  const insertCue = (etapaId: string) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? conteudo.length;
    const { text, nextCursor } = insertCueAtCursor(conteudo, cursor, etapaId);
    setConteudo(text);
    setDirty(true);
    cursorRef.current = nextCursor;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const importText = (text: string, replace: boolean) => {
    setConteudo(replace ? text : conteudo + (conteudo ? '\n\n' : '') + text);
    setDirty(true);
  };

  const saveAsTemplate = async () => {
    if (!conteudo.trim()) {
      toast.error('Nada para salvar como template');
      return;
    }
    await upsertRoteiro.mutateAsync({
      titulo: `${titulo} (template)`,
      conteudo,
      is_template: true,
      secao_id: null,
    });
    toast.success('Salvo como template na biblioteca');
  };

  const loadTemplate = (t: Roteiro) => {
    setConteudo((prev) => prev + (prev ? '\n\n' : '') + t.conteudo);
    setDirty(true);
    toast.success(`Template "${t.titulo}" inserido`);
  };

  const parsed = parseRoteiro(conteudo);
  const cueCount = parsed.filter((b) => b.type === 'cue').length;

  return (
    <div className="space-y-4">
      {/* Header */}
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
            <PopoverContent className="w-64 p-2" align="end">
              <div className="text-xs text-white/60 mb-2 px-2">
                {templates.length === 0 ? 'Nenhum template salvo' : 'Clique para inserir'}
              </div>
              <ScrollArea className="max-h-64">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-sm truncate"
                  >
                    {t.titulo}
                  </button>
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
          <Button
            size="sm"
            onClick={() => setShowReader(true)}
            className="bg-[hsl(var(--gold))]/20 border border-[hsl(var(--gold))]/40 text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/30"
          >
            <Play className="w-4 h-4 mr-1" /> Iniciar Leitura
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
        {/* Editor */}
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={conteudo}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Cole aqui o texto do ritual. Use "Inserir cue" para marcar o momento exato em que cada música deve tocar.\n\nExemplo:\n\n"O Venerável Mestre declara abertos os trabalhos..."\n\n[[CUE:etapa-de-abertura]]\n\n"Prossegue com a leitura da ata..."`}
            className="min-h-[500px] font-serif text-base leading-relaxed bg-black/20 border-white/10 focus-visible:ring-[hsl(var(--gold))]/40"
          />
          <div className="text-xs text-white/50 flex items-center gap-4">
            <span>{conteudo.length} caracteres</span>
            <span>•</span>
            <span>{cueCount} cue{cueCount === 1 ? '' : 's'} musical{cueCount === 1 ? '' : 'is'}</span>
            {dirty && <span className="text-[hsl(var(--gold))]">• alterações não salvas</span>}
          </div>
        </div>

        {/* Sidebar: etapas para inserir cue */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 md:sticky md:top-4 h-fit">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-2 flex items-center gap-1">
            <Music className="w-3 h-3" /> Inserir cue musical
          </div>
          <div className="text-xs text-white/50 mb-3">
            Clique numa etapa para inserir o marcador no ponto do texto onde a música deve tocar.
          </div>
          <ScrollArea className="max-h-[420px]">
            <div className="space-y-1">
              {stages.length === 0 && (
                <div className="text-xs text-white/40 italic">Nenhuma etapa criada nesta seção.</div>
              )}
              {stages.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => insertCue(s.id)}
                  className="w-full flex items-center gap-2 text-left px-2 py-2 rounded border border-transparent hover:border-[hsl(var(--gold))]/40 hover:bg-[hsl(var(--gold))]/10 transition-all text-sm"
                >
                  <span className="w-6 h-6 rounded-full bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="truncate">{s.nome_simbolico}</span>
                  <Plus className="w-3 h-3 ml-auto opacity-50 shrink-0" />
                </button>
              ))}
            </div>
          </ScrollArea>
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
