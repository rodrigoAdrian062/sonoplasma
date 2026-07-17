import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { RoteiroEditor } from '@/components/roteiro/RoteiroEditor';
import { MasonicFooter } from '@/components/MasonicFooter';

export default function RoteiroPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { stages, isLoading: loadingStages } = useStages();
  const { sections, isLoading: loadingSections } = useSections();

  const section = useMemo(() => {
    const idPart = sectionId?.split('-').pop() || sectionId;
    return sections.find((s) => s.id.startsWith(idPart || '')) || sections.find((s) => s.id === sectionId);
  }, [sections, sectionId]);

  const sectionStages = useMemo(
    () => stages.filter((s) => s.secao_id === section?.id),
    [stages, section],
  );

  useEffect(() => {
    if (section) document.title = `Roteiro — ${section.nome}`;
  }, [section]);

  if (loadingStages || loadingSections) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--gold))]" />
      </div>
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-white/70">Seção não encontrada</p>
        <Button onClick={() => navigate('/')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/secao/${sectionId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para a seção
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-[hsl(var(--gold))]/70">Roteiro</div>
            <div className="text-lg font-semibold truncate">{section.nome}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <RoteiroEditor
          secaoId={section.id}
          secaoNome={section.nome}
          stages={sectionStages}
        />
      </div>

      <MasonicFooter />
    </div>
  );
}
