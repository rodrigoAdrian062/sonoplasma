import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, BookOpen, Trash2, Copy, Loader2, Pencil, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRoteiros, Roteiro } from '@/hooks/useRoteiros';
import { useSections } from '@/hooks/useSections';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { parseRoteiro } from '@/lib/roteiroFormat';
import { MasonicFooter } from '@/components/MasonicFooter';

export default function RoteirosLibrary() {
  const navigate = useNavigate();
  const { roteiros, isLoading, deleteRoteiro, upsertRoteiro } = useRoteiros();
  const { sections } = useSections();
  const [applyingTo, setApplyingTo] = useState<{ conteudo: string; titulo: string } | null>(null);
  const [editing, setEditing] = useState<Roteiro | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editConteudo, setEditConteudo] = useState('');

  const templates = roteiros.filter((r) => r.is_template);
  const sectionRoteiros = roteiros.filter((r) => !r.is_template);

  const openEdit = (r: Roteiro) => {
    setEditing(r);
    setEditTitulo(r.titulo);
    setEditConteudo(r.conteudo);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await upsertRoteiro.mutateAsync({
        id: editing.id,
        titulo: editTitulo.trim() || 'Sem título',
        conteudo: editConteudo,
        is_template: editing.is_template,
      });
      toast.success('Roteiro atualizado');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    }
  };

  const applyToSection = async (secaoId: string) => {
    if (!applyingTo) return;
    try {
      const { data: existing } = await supabase
        .from('sonoplastia_roteiros' as any)
        .select('*')
        .eq('secao_id', secaoId)
        .maybeSingle();
      const prev = (existing as any)?.conteudo || '';
      await upsertRoteiro.mutateAsync({
        id: (existing as any)?.id,
        secao_id: secaoId,
        titulo: applyingTo.titulo,
        conteudo: prev ? prev + '\n\n' + applyingTo.conteudo : applyingTo.conteudo,
        is_template: false,
      });
      toast.success('Template aplicado à seção');
      setApplyingTo(null);
      navigate(`/roteiro/${secaoId}`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao aplicar');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Início
          </Button>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-[hsl(var(--gold))]/70">Biblioteca</div>
            <div className="text-lg font-semibold">Roteiros</div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-8">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--gold))]" />
          </div>
        )}

        {/* Templates */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[hsl(var(--gold))]" /> Templates salvos
          </h2>
          {templates.length === 0 && (
            <p className="text-white/50 text-sm italic">
              Nenhum template ainda. Dentro de uma seção, edite o roteiro e clique em "Salvar como template".
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => {
              const cues = parseRoteiro(t.conteudo).filter((b) => b.type === 'cue').length;
              return (
                <Card key={t.id} className="p-4 bg-black/30 border-white/10 flex flex-col">
                  <div className="font-semibold truncate">{t.titulo}</div>
                  <div className="text-xs text-white/50 mt-1">
                    {t.conteudo.length} caracteres · {cues} cue{cues === 1 ? '' : 's'}
                  </div>
                  <p className="text-xs text-white/60 mt-2 line-clamp-3 font-serif flex-1">
                    {t.conteudo.replace(/\[\[CUE:[^\]]+\]\]/g, '▶').slice(0, 200)}
                  </p>
                  <div className="flex gap-1 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setApplyingTo({ conteudo: t.conteudo, titulo: t.titulo })}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Usar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Editar">
                      <Pencil className="w-4 h-4 text-[hsl(var(--gold))]" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Excluir template "${t.titulo}"?`)) deleteRoteiro.mutate(t.id);
                      }}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Roteiros de seções */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Roteiros por seção</h2>
          {sectionRoteiros.length === 0 && (
            <p className="text-white/50 text-sm italic">Ainda não criou roteiro em nenhuma seção.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sectionRoteiros.map((r) => {
              const sec = sections.find((s) => s.id === r.secao_id);
              const cues = parseRoteiro(r.conteudo).filter((b) => b.type === 'cue').length;
              return (
                <Card key={r.id} className="p-4 bg-black/30 border-white/10 flex flex-col">
                  <div className="font-semibold truncate">{r.titulo}</div>
                  <div className="text-xs text-white/50 mt-1">
                    {sec?.nome || 'Seção removida'} · {cues} cue{cues === 1 ? '' : 's'}
                  </div>
                  <p className="text-xs text-white/60 mt-2 line-clamp-3 font-serif flex-1">
                    {r.conteudo.replace(/\[\[CUE:[^\]]+\]\]/g, '▶').slice(0, 200) || (
                      <span className="italic text-white/40">Roteiro vazio</span>
                    )}
                  </p>
                  <div className="flex gap-1 mt-3">
                    {sec && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/roteiro/${sec.id}`)}
                      >
                        Abrir
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Editar rápido">
                      <Pencil className="w-4 h-4 text-[hsl(var(--gold))]" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Excluir roteiro "${r.titulo}"?`)) deleteRoteiro.mutate(r.id);
                      }}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>

      {/* Aplicar template em seção */}
      <Dialog open={!!applyingTo} onOpenChange={(v) => !v && setApplyingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar template em qual seção?</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => applyToSection(s.id)}
                className="w-full text-left px-3 py-2 rounded hover:bg-white/5 border border-transparent hover:border-[hsl(var(--gold))]/30"
              >
                {s.nome}
              </button>
            ))}
            {sections.length === 0 && (
              <div className="text-sm text-white/50 italic">Nenhuma seção criada ainda.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor de roteiro */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.is_template ? 'Editar template' : 'Editar roteiro'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Título</label>
              <Input
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
                placeholder="Título do roteiro"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">
                Conteúdo (use <code className="text-[hsl(var(--gold))]">[[CUE:id-da-etapa]]</code> para marcar pontos de música)
              </label>
              <Textarea
                value={editConteudo}
                onChange={(e) => setEditConteudo(e.target.value)}
                rows={18}
                className="font-mono text-sm"
              />
              <div className="text-xs text-white/40 mt-1">
                {editConteudo.length} caracteres ·{' '}
                {parseRoteiro(editConteudo).filter((b) => b.type === 'cue').length} cues
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={upsertRoteiro.isPending}>
              {upsertRoteiro.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MasonicFooter />
    </div>
  );
}
