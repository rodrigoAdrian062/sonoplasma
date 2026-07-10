import { createContext, useContext, useState, ReactNode } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDraggable, useDroppable, DragStartEvent, DragEndEvent,
} from '@dnd-kit/core';
import { GripVertical, Music, Folder, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { useAudioFolders } from '@/hooks/useAudioFolders';

export interface DragAudio {
  id: string;
  nome: string;
  audio_url: string;
}

interface AudioDndZoneProps {
  accent?: string; // tailwind color name e.g. 'red', 'green'
  onSendToStage: (audio: DragAudio, stageId: string) => void;
  onMoveToFolder: (audio: DragAudio, folderId: string | null) => void;
  children: ReactNode;
}

// ---- Draggable row ----
interface HandleProps {
  ref: (el: HTMLElement | null) => void;
  [key: string]: unknown;
}

const RowCtx = createContext<{ accent: string } | null>(null);

export function DraggableAudioRow({
  audio,
  children,
}: {
  audio: DragAudio;
  children: (args: { handleProps: HandleProps; isDragging: boolean }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({ id: audio.id, data: audio });

  const handleProps: HandleProps = {
    ref: setActivatorNodeRef,
    ...listeners,
    ...attributes,
  };

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined}
      className={cn(isDragging && 'opacity-40')}
    >
      {children({ handleProps, isDragging })}
    </div>
  );
}

// A ready-to-use grip handle
export function DragHandle({ handleProps, className }: { handleProps: HandleProps; className?: string }) {
  const ctx = useContext(RowCtx);
  return (
    <button
      type="button"
      {...handleProps}
      className={cn(
        'h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground touch-none cursor-grab active:cursor-grabbing',
        className,
      )}
      title="Arraste para uma etapa ou pasta"
      aria-label="Arrastar"
      onClick={(e) => e.preventDefault()}
    >
      <GripVertical size={18} className={ctx ? `text-${ctx.accent}-500/70` : undefined} />
    </button>
  );
}

// ---- Droppable target ----
function DropTarget({
  id,
  label,
  sub,
  icon,
  accent,
}: {
  id: string;
  label: string;
  sub?: string;
  icon: ReactNode;
  accent: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'shrink-0 w-32 rounded-xl border p-2 flex flex-col gap-1 transition-all',
        isOver
          ? `border-${accent}-500 bg-${accent}-500/20 scale-105`
          : 'border-border/60 bg-card/70',
      )}
    >
      <div className="flex items-center gap-1.5">{icon}</div>
      <p className="text-xs font-medium leading-tight line-clamp-2">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

export function AudioDndZone({ accent = 'red', onSendToStage, onMoveToFolder, children }: AudioDndZoneProps) {
  const { stages } = useStages();
  const { sections } = useSections();
  const { folders } = useAudioFolders();
  const [active, setActive] = useState<DragAudio | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const handleStart = (e: DragStartEvent) => {
    setActive((e.active.data.current as DragAudio) ?? null);
  };

  const handleEnd = (e: DragEndEvent) => {
    const dropped = active;
    setActive(null);
    if (!dropped || !e.over) return;
    const overId = String(e.over.id);
    if (overId.startsWith('stage:')) onSendToStage(dropped, overId.slice(6));
    else if (overId.startsWith('folder:')) {
      const fid = overId.slice(7);
      onMoveToFolder(dropped, fid === 'null' ? null : fid);
    }
  };

  const stagesBySection = sections.map((sec) => ({
    section: sec,
    stages: stages.filter((s) => s.secao_id === sec.id),
  }));
  const unassignedStages = stages.filter((s) => !s.secao_id);

  return (
    <RowCtx.Provider value={{ accent }}>
      <DndContext sensors={sensors} onDragStart={handleStart} onDragEnd={handleEnd} onDragCancel={() => setActive(null)}>
        {children}

        <DragOverlay dropAnimation={null}>
          {active ? (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-${accent}-500 text-white shadow-2xl max-w-[240px]`}>
              <Music size={16} />
              <span className="text-sm font-medium truncate">{active.nome}</span>
            </div>
          ) : null}
        </DragOverlay>

        {/* Drop panel */}
        {active && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md p-3 shadow-2xl animate-in slide-in-from-bottom">
            <p className="text-xs text-muted-foreground mb-2 text-center">
              Solte em uma <span className="font-semibold text-foreground">etapa</span> ou <span className="font-semibold text-foreground">pasta</span>
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {folders.map((f) => (
                <DropTarget
                  key={f.id}
                  id={`folder:${f.id}`}
                  label={f.nome}
                  sub="Pasta"
                  accent={accent}
                  icon={<Folder size={16} className={`text-${accent}-500`} />}
                />
              ))}
              {stagesBySection.map(({ section, stages: ss }) =>
                ss.map((stage) => (
                  <DropTarget
                    key={stage.id}
                    id={`stage:${stage.id}`}
                    label={stage.nome_simbolico}
                    sub={section.nome}
                    accent={accent}
                    icon={<Layers size={16} className={`text-${accent}-500`} />}
                  />
                )),
              )}
              {unassignedStages.map((stage) => (
                <DropTarget
                  key={stage.id}
                  id={`stage:${stage.id}`}
                  label={stage.nome_simbolico}
                  sub="Sem seção"
                  accent={accent}
                  icon={<Layers size={16} className={`text-${accent}-500`} />}
                />
              ))}
            </div>
          </div>
        )}
      </DndContext>
    </RowCtx.Provider>
  );
}
