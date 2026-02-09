import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2, Plus } from 'lucide-react';
import { CeremonySection } from '@/types/section';
import { CeremonyStage } from '@/types/ceremony';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { StageAudio } from '@/types/stageAudio';
import { SortableStageCard } from './SortableStageCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface SectionCardProps {
  section: CeremonySection;
  stages: CeremonyStage[];
  audiosByStageId: Record<string, StageAudio[]>;
  currentStageId: string | null;
  status: 'idle' | 'playing' | 'paused';
  onPlay: (stage: CeremonyStage, audioUrl?: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onEditSection: () => void;
  onDeleteSection: () => void;
  onEditStage: (stage: CeremonyStage) => void;
  onDeleteStage: (stage: CeremonyStage) => void;
  onAddStage: () => void;
}

export function SectionCard({
  section,
  stages,
  audiosByStageId,
  currentStageId,
  status,
  onPlay,
  onPause,
  onResume,
  onStop,
  onEditSection,
  onDeleteSection,
  onEditStage,
  onDeleteStage,
  onAddStage,
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      {/* Section Header */}
      <div 
        className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
      >
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
        
        <div className="p-2 bg-gold/10 rounded-lg">
          <CeremonyIcon name={section.icone || 'folder'} size={20} className="text-gold" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground truncate">
            {section.nome}
          </h3>
          {section.descricao && (
            <p className="text-xs text-muted-foreground truncate">{section.descricao}</p>
          )}
        </div>

        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
          {stages.length} {stages.length === 1 ? 'etapa' : 'etapas'}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddStage}
            className="h-8 w-8 text-gold hover:text-gold-glow hover:bg-gold/10"
            title="Adicionar etapa"
          >
            <Plus size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEditSection}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Editar seção"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDeleteSection}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title="Excluir seção"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* Stages List */}
      {isExpanded && (
        <div className="px-2 sm:px-4 pb-3 sm:pb-4">
          {stages.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm mb-2">Nenhuma etapa nesta seção</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddStage}
                className="border-gold/50 text-gold hover:bg-gold/10"
              >
                <Plus size={14} className="mr-1" />
                Adicionar etapa
              </Button>
            </div>
          ) : (
            <SortableContext
              items={stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-3 pl-2 sm:pl-8">
                {stages.map((stage, index) => (
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
                      onPlay={(audioUrl) => onPlay(stage, audioUrl)}
                      onPause={onPause}
                      onResume={onResume}
                      onStop={onStop}
                      onEdit={() => onEditStage(stage)}
                      onDelete={() => onDeleteStage(stage)}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
