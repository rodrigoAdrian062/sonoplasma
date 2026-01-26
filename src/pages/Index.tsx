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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Header } from '@/components/Header';
import { ControlBar } from '@/components/ControlBar';
import { SortableStageCard } from '@/components/SortableStageCard';
import { StageEditModal } from '@/components/StageEditModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { useStages } from '@/hooks/useStages';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { CeremonyStage, CeremonyStageInsert, CeremonyStageUpdate } from '@/types/ceremony';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { stages, isLoading, createStage, updateStage, deleteStage, reorderStages } = useStages();
  const {
    currentStageId,
    status,
    volume,
    play,
    pause,
    stop,
    setVolume,
  } = useAudioPlayer();

  const [editingStage, setEditingStage] = useState<CeremonyStage | null>(null);
  const [isNewStageModal, setIsNewStageModal] = useState(false);
  const [deleteStageData, setDeleteStageData] = useState<CeremonyStage | null>(null);

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

  const handlePlay = (stage: CeremonyStage) => {
    if (stage.audio_url) {
      play(stage.id, stage.audio_url);
    }
  };

  const handleSaveStage = (data: CeremonyStageInsert | CeremonyStageUpdate) => {
    if (editingStage) {
      updateStage.mutate({ id: editingStage.id, ...data });
    } else {
      const insertData: CeremonyStageInsert = {
        nome_simbolico: data.nome_simbolico || 'Nova Etapa',
        descricao: data.descricao,
        audio_url: data.audio_url,
        tempo_padrao: data.tempo_padrao,
        icone: data.icone,
        ordem: stages.length + 1,
        ativo: true,
      };
      createStage.mutate(insertData);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
          <p className="text-muted-foreground">Carregando etapas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onAddStage={() => setIsNewStageModal(true)} />
      <ControlBar
        volume={volume}
        onVolumeChange={setVolume}
        activeStage={activeStage ? {
          symbolicName: activeStage.nome_simbolico,
        } : null}
        isPlaying={status === 'playing'}
      />
      
      <main className="container py-6">
        {stages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma etapa cadastrada</p>
            <button
              onClick={() => setIsNewStageModal(true)}
              className="text-gold hover:text-gold-glow transition-colors"
            >
              Adicionar primeira etapa
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-4 pl-8">
                {stages.map((stage, index) => (
                  <div
                    key={stage.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <SortableStageCard
                      stage={stage}
                      isPlaying={currentStageId === stage.id && status === 'playing'}
                      isPaused={currentStageId === stage.id && status === 'paused'}
                      onPlay={() => handlePlay(stage)}
                      onPause={pause}
                      onStop={stop}
                      onEdit={() => setEditingStage(stage)}
                      onDelete={() => setDeleteStageData(stage)}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <footer className="mt-12 py-6 border-t border-border">
          <p className="text-center text-xs text-muted-foreground">
            Sistema de Sonoplastia Cerimonial
          </p>
        </footer>
      </main>

      {/* Edit Modal */}
      <StageEditModal
        stage={editingStage}
        isOpen={!!editingStage || isNewStageModal}
        onClose={() => {
          setEditingStage(null);
          setIsNewStageModal(false);
        }}
        onSave={handleSaveStage}
        isNew={isNewStageModal}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteStageData}
        onClose={() => setDeleteStageData(null)}
        onConfirm={handleDeleteStage}
        stageName={deleteStageData?.nome_simbolico || ''}
      />
    </div>
  );
};

export default Index;
