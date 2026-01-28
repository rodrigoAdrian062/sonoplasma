import { useState, useMemo } from 'react';
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
import { SortableStageCard } from '@/components/SortableStageCard';
import { Header } from '@/components/Header';
import { ControlBar } from '@/components/ControlBar';
import { SectionCard } from '@/components/SectionCard';
import { SectionEditModal } from '@/components/SectionEditModal';
import { StageEditModal } from '@/components/StageEditModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { PresentationMode } from '@/components/PresentationMode';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { useStageAudios, useAllStageAudios } from '@/hooks/useStageAudios';
import { useUniversalAudioPlayer } from '@/hooks/useUniversalAudioPlayer';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { CeremonyStage, CeremonyStageInsert, CeremonyStageUpdate } from '@/types/ceremony';
import { CeremonySection, CeremonySectionInsert, CeremonySectionUpdate } from '@/types/section';
import { Loader2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { settings } = useSettings();
  useThemeColor(settings?.cor_tema);
  
  const { stages, isLoading: stagesLoading, createStage, updateStage, deleteStage, reorderStages } = useStages();
  const { sections, isLoading: sectionsLoading, createSection, updateSection, deleteSection } = useSections();
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
  } = useUniversalAudioPlayer();

  const [editingStage, setEditingStage] = useState<CeremonyStage | null>(null);
  const [isNewStageModal, setIsNewStageModal] = useState(false);
  const [newStageForSectionId, setNewStageForSectionId] = useState<string | null>(null);
  const [deleteStageData, setDeleteStageData] = useState<CeremonyStage | null>(null);
  
  const [editingSection, setEditingSection] = useState<CeremonySection | null>(null);
  const [isNewSectionModal, setIsNewSectionModal] = useState(false);
  const [deleteSectionData, setDeleteSectionData] = useState<CeremonySection | null>(null);
  
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeStage = useMemo(() => {
    return stages.find(s => s.id === currentStageId) || null;
  }, [stages, currentStageId]);

  // Group stages by section
  const stagesBySection = useMemo(() => {
    const grouped: Record<string, CeremonyStage[]> = {};
    sections.forEach(section => {
      grouped[section.id] = stages.filter(s => s.secao_id === section.id);
    });
    // Stages without section
    grouped['__unassigned__'] = stages.filter(s => !s.secao_id);
    return grouped;
  }, [stages, sections]);

  const handlePlay = (stage: CeremonyStage, audioUrl?: string) => {
    if (audioUrl) {
      play(stage.id, audioUrl);
    }
  };

  const handleSaveStage = async (
    data: CeremonyStageInsert | CeremonyStageUpdate, 
    audios?: Array<{ nome: string; audio_url: string }>
  ) => {
    if (editingStage) {
      updateStage.mutate({ id: editingStage.id, ...data });
      if (audios) {
        saveAudios.mutate({ etapa_id: editingStage.id, audios });
      }
    } else {
      const sectionStages = newStageForSectionId 
        ? stages.filter(s => s.secao_id === newStageForSectionId)
        : stages.filter(s => !s.secao_id);
      
      const insertData: CeremonyStageInsert = {
        nome_simbolico: data.nome_simbolico || 'Nova Etapa',
        descricao: data.descricao,
        tempo_padrao: data.tempo_padrao,
        icone: data.icone,
        ordem: sectionStages.length + 1,
        ativo: true,
        secao_id: newStageForSectionId,
      };
      createStage.mutate(insertData, {
        onSuccess: (newStage) => {
          if (audios && audios.length > 0) {
            saveAudios.mutate({ etapa_id: newStage.id, audios });
          }
        }
      });
    }
  };

  const handleSaveSection = (data: CeremonySectionInsert | CeremonySectionUpdate) => {
    if (editingSection) {
      updateSection.mutate({ id: editingSection.id, ...data });
    } else {
      createSection.mutate(data as CeremonySectionInsert);
    }
  };

  const handleDeleteStage = () => {
    if (deleteStageData) {
      if (currentStageId === deleteStageData.id) {
        stop();
      }
      deleteStage.mutate(deleteStageData.id);
    }
  };

  const handleDeleteSection = () => {
    if (deleteSectionData) {
      deleteSection.mutate(deleteSectionData.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex((s) => s.id === active.id);
      const newIndex = stages.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(stages, oldIndex, newIndex);
      const orderedIds = reordered.map((s) => s.id);
      reorderStages.mutate(orderedIds);
    }
  };

  const handleAddStageToSection = (sectionId: string) => {
    setNewStageForSectionId(sectionId);
    setIsNewStageModal(true);
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

  // Presentation mode handler
  const handlePresentationPlay = (stageId: string, audioUrl: string) => {
    play(stageId, audioUrl);
  };

  if (isPresentationMode) {
    return (
      <PresentationMode
        stages={stages}
        audiosByStageId={audiosByStageId}
        currentStageId={currentStageId}
        status={status}
        volume={volume}
        onVolumeChange={setVolume}
        onPlay={handlePresentationPlay}
        onPause={pause}
        onResume={resume}
        onStop={stop}
        onClose={() => setIsPresentationMode(false)}
        settings={settings}
      />
    );
  }

  const hasContent = sections.length > 0 || stages.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onAddStage={() => {
          setNewStageForSectionId(null);
          setIsNewStageModal(true);
        }}
        onAddSection={() => setIsNewSectionModal(true)}
        onPresentationMode={() => setIsPresentationMode(true)}
        hasStages={stages.length > 0}
      />
      <ControlBar
        volume={volume}
        onVolumeChange={setVolume}
        activeStage={activeStage ? {
          symbolicName: activeStage.nome_simbolico,
        } : null}
        isPlaying={status === 'playing'}
      />
      
      <main className="container py-6">
        {!hasContent ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-6">Nenhuma seção ou etapa cadastrada</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setIsNewSectionModal(true)}
                className="bg-gold hover:bg-gold-glow text-background gap-2"
              >
                <FolderPlus size={18} />
                Criar primeira seção
              </Button>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid gap-6">
              {/* Sections with their stages */}
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <SectionCard
                    section={section}
                    stages={stagesBySection[section.id] || []}
                    audiosByStageId={audiosByStageId}
                    currentStageId={currentStageId}
                    status={status}
                    onPlay={handlePlay}
                    onPause={pause}
                    onResume={resume}
                    onStop={stop}
                    onEditSection={() => setEditingSection(section)}
                    onDeleteSection={() => setDeleteSectionData(section)}
                    onEditStage={(stage) => setEditingStage(stage)}
                    onDeleteStage={(stage) => setDeleteStageData(stage)}
                    onAddStage={() => handleAddStageToSection(section.id)}
                  />
                </div>
              ))}

              {/* Unassigned stages (if any) */}
              {stagesBySection['__unassigned__']?.length > 0 && (
                <div className="bg-card/30 rounded-xl border border-border/30 p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <FolderPlus size={20} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Etapas sem seção
                    </h3>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                      {stagesBySection['__unassigned__'].length} {stagesBySection['__unassigned__'].length === 1 ? 'etapa' : 'etapas'}
                    </span>
                  </div>
                  <SortableContext
                    items={stagesBySection['__unassigned__'].map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid gap-3 pl-8">
                      {stagesBySection['__unassigned__'].map((stage, index) => (
                        <div
                          key={stage.id}
                          className="animate-fade-in"
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
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
                          />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </div>
              )}
            </div>
          </DndContext>
        )}

        <footer className="mt-12 py-6 border-t border-border">
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            Desenvolvido com <span className="text-red-500">❤</span> pelo Ir∴ Rodrigo Adriano
          </p>
        </footer>
      </main>

      {/* Section Edit Modal */}
      <SectionEditModal
        section={editingSection}
        isOpen={!!editingSection || isNewSectionModal}
        onClose={() => {
          setEditingSection(null);
          setIsNewSectionModal(false);
        }}
        onSave={handleSaveSection}
        isNew={isNewSectionModal}
        existingSectionsCount={sections.length}
      />

      {/* Stage Edit Modal */}
      <StageEditModal
        stage={editingStage}
        isOpen={!!editingStage || isNewStageModal}
        onClose={() => {
          setEditingStage(null);
          setIsNewStageModal(false);
          setNewStageForSectionId(null);
        }}
        onSave={handleSaveStage}
        isNew={isNewStageModal}
        sections={sections}
        defaultSectionId={newStageForSectionId}
      />

      {/* Delete Stage Confirm Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteStageData}
        onClose={() => setDeleteStageData(null)}
        onConfirm={handleDeleteStage}
        stageName={deleteStageData?.nome_simbolico || ''}
      />

      {/* Delete Section Confirm Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteSectionData}
        onClose={() => setDeleteSectionData(null)}
        onConfirm={handleDeleteSection}
        stageName={deleteSectionData?.nome || ''}
        title="Excluir Seção"
        description="Tem certeza que deseja excluir esta seção? Todas as etapas dentro dela também serão excluídas permanentemente."
      />
    </div>
  );
};

export default Index;
