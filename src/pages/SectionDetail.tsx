import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { SortableStageCard } from '@/components/SortableStageCard';
import { ControlBar } from '@/components/ControlBar';
import { StageEditModal } from '@/components/StageEditModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { CeremonyIcon } from '@/components/icons/CeremonyIcon';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { useStageAudios, useAllStageAudios } from '@/hooks/useStageAudios';
import { useUniversalAudioPlayer } from '@/hooks/useUniversalAudioPlayer';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { CeremonyStage, CeremonyStageInsert, CeremonyStageUpdate } from '@/types/ceremony';
import { Button } from '@/components/ui/button';

const SectionDetail = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  useThemeColor(settings?.cor_tema);

  const { stages, isLoading: stagesLoading, createStage, updateStage, deleteStage, reorderStages } = useStages();
  const { sections, isLoading: sectionsLoading } = useSections();
  const { saveAudios } = useStageAudios();
  const { audiosByStageId } = useAllStageAudios();
  const {
    currentStageId,
    status,
    volume,
    play,
    pause,
    resume,
    stop,
    setVolume,
    seekForward,
    seekBackward,
  } = useUniversalAudioPlayer();

  const [editingStage, setEditingStage] = useState<CeremonyStage | null>(null);
  const [isNewStageModal, setIsNewStageModal] = useState(false);
  const [deleteStageData, setDeleteStageData] = useState<CeremonyStage | null>(null);

  const section = useMemo(() => {
    // sectionId can be "slug-shortid" format, extract the short ID (last 8 chars after last dash)
    const idPart = sectionId?.split('-').pop() || sectionId;
    return sections.find(s => s.id.startsWith(idPart || '')) || sections.find(s => s.id === sectionId);
  }, [sections, sectionId]);
  const sectionStages = useMemo(() => stages.filter(s => s.secao_id === section?.id), [stages, section]);

  const activeStage = useMemo(() => {
    return stages.find(s => s.id === currentStageId) || null;
  }, [stages, currentStageId]);

  // Update page title with section name
  useEffect(() => {
    if (section) {
      document.title = section.nome;
    }
    return () => {
      document.title = settings?.nome_app || 'Sonoplastia Cerimonial';
    };
  }, [section, settings]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handlePlay = (stage: CeremonyStage, audioUrl?: string) => {
    if (audioUrl) play(stage.id, audioUrl);
  };

  const handleSaveStage = async (
    data: CeremonyStageInsert | CeremonyStageUpdate,
    audios?: Array<{ nome: string; audio_url: string }>
  ) => {
    if (editingStage) {
      updateStage.mutate({ id: editingStage.id, ...data });
      if (audios) saveAudios.mutate({ etapa_id: editingStage.id, audios });
    } else {
      const insertData: CeremonyStageInsert = {
        nome_simbolico: data.nome_simbolico || 'Nova Etapa',
        descricao: data.descricao,
        tempo_padrao: data.tempo_padrao,
        icone: data.icone,
        ordem: sectionStages.length + 1,
        ativo: true,
        secao_id: section?.id || null,
      };
      createStage.mutate(insertData, {
        onSuccess: (newStage) => {
          if (audios && audios.length > 0) {
            saveAudios.mutate({ etapa_id: newStage.id, audios });
          }
        },
      });
    }
  };

  const handleDeleteStage = () => {
    if (deleteStageData) {
      if (currentStageId === deleteStageData.id) stop();
      deleteStage.mutate(deleteStageData.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionStages.findIndex((s) => s.id === active.id);
      const newIndex = sectionStages.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(sectionStages, oldIndex, newIndex);
      const orderedIds = reordered.map((s) => s.id);
      reorderStages.mutate(orderedIds);
    }
  };

  const isLoading = stagesLoading || sectionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Seção não encontrada</p>
          <Button onClick={() => navigate('/')} variant="outline">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="p-2 bg-gold/10 rounded-lg shrink-0">
              <CeremonyIcon name={section.icone || 'folder'} size={22} className="text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg sm:text-2xl font-semibold text-foreground truncate">
                {section.nome}
              </h1>
              {section.descricao && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {section.descricao}
                </p>
              )}
            </div>
            <Button
              onClick={() => setIsNewStageModal(true)}
              size="sm"
              className="gap-1.5 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 hover:border-gold/50 shrink-0"
              variant="outline"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nova Etapa</span>
            </Button>
          </div>
        </div>
      </header>

      <ControlBar
        volume={volume}
        onVolumeChange={setVolume}
        activeStage={activeStage ? { symbolicName: activeStage.nome_simbolico } : null}
        isPlaying={status === 'playing'}
      />

      <main className="container px-3 sm:px-4 py-4 sm:py-6">
        {sectionStages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma etapa nesta seção</p>
            <Button
              onClick={() => setIsNewStageModal(true)}
              className="gap-2 bg-gold hover:bg-gold/90 text-background"
            >
              <Plus size={18} />
              Criar primeira etapa
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionStages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-3">
                {sectionStages.map((stage, index) => (
                  <div key={stage.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.03}s` }}>
                    <SortableStageCard
                      stage={stage}
                      audios={audiosByStageId[stage.id] || []}
                      isPlaying={currentStageId === stage.id && status === 'playing'}
                      isPaused={currentStageId === stage.id && status === 'paused'}
                      onPlay={(audioUrl) => handlePlay(stage, audioUrl)}
                      onPause={pause}
                      onResume={resume}
                      onStop={stop}
                      onEdit={() => setEditingStage(stage)}
                      onDelete={() => setDeleteStageData(stage)}
                      onSeekForward={() => seekForward()}
                      onSeekBackward={() => seekBackward()}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <footer className="mt-12 py-6 border-t border-border">
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            Desenvolvido com <span className="text-red-500">❤</span> pelo Ir∴ Rodrigo Adriano
          </p>
        </footer>
      </main>

      <StageEditModal
        stage={editingStage}
        isOpen={!!editingStage || isNewStageModal}
        onClose={() => {
          setEditingStage(null);
          setIsNewStageModal(false);
        }}
        onSave={handleSaveStage}
        isNew={isNewStageModal}
        sections={sections}
        defaultSectionId={section?.id}
      />

      <DeleteConfirmModal
        isOpen={!!deleteStageData}
        onClose={() => setDeleteStageData(null)}
        onConfirm={handleDeleteStage}
        stageName={deleteStageData?.nome_simbolico || ''}
      />
    </div>
  );
};

export default SectionDetail;
