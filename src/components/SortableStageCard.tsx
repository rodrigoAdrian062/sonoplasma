import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { StageCard } from './StageCard';
import { CeremonyStage } from '@/types/ceremony';

interface SortableStageCardProps {
  stage: CeremonyStage;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SortableStageCard({
  stage,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onStop,
  onEdit,
  onDelete,
}: SortableStageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <div className="p-2 text-muted-foreground hover:text-gold transition-colors">
          <GripVertical size={20} />
        </div>
      </div>
      <StageCard
        stage={stage}
        isPlaying={isPlaying}
        isPaused={isPaused}
        onPlay={onPlay}
        onPause={onPause}
        onStop={onStop}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
