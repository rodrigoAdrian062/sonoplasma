import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { StageCard } from './StageCard';
import { CopyStageMenu } from './CopyStageMenu';
import { CeremonyStage } from '@/types/ceremony';
import { StageAudio } from '@/types/stageAudio';
import { CeremonySection } from '@/types/section';

interface SortableStageCardProps {
  stage: CeremonyStage;
  audios: StageAudio[];
  stageNumber?: number;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime?: number;
  duration?: number;
  onPlay: (audioUrl: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onSeekTo?: (seconds: number) => void;
  continuousPlayback?: boolean;
  sections?: CeremonySection[];
  currentSectionId?: string;
  onCopyToSection?: (targetSectionId: string) => void;
}


export function SortableStageCard({
  stage,
  audios,
  stageNumber,
  isPlaying,
  isPaused,
  currentTime,
  duration,
  onPlay,
  onPause,
  onResume,
  onStop,
  onEdit,
  onDelete,
  onSeekForward,
  onSeekBackward,
  onSeekTo,
  continuousPlayback,
  sections,
  currentSectionId,
  onCopyToSection,
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
      {sections && currentSectionId && onCopyToSection && (
        <div className="absolute right-2 top-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyStageMenu
            sections={sections}
            currentSectionId={currentSectionId}
            onCopy={onCopyToSection}
          />
        </div>
      )}
      <StageCard
        stage={stage}
        audios={audios}
        stageNumber={stageNumber}

        isPlaying={isPlaying}
        isPaused={isPaused}
        currentTime={currentTime}
        duration={duration}
        onPlay={onPlay}
        onPause={onPause}
        onResume={onResume}
        onStop={onStop}
        onEdit={onEdit}
        onDelete={onDelete}
        onSeekForward={onSeekForward}
        onSeekBackward={onSeekBackward}
        onSeekTo={onSeekTo}
        continuousPlayback={continuousPlayback}
      />
    </div>
  );
}

