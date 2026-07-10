import { createContext, useContext, useState, ReactNode } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDraggable, useDroppable, DragStartEvent, DragEndEvent,
} from '@dnd-kit/core';
import { GripVertical, Music, Folder, Layers, ChevronDown, ChevronRight, PanelRightClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { useAudioFolders } from '@/hooks/useAudioFolders';
import { useAllStageAudios } from '@/hooks/useStageAudios';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';

export interface DragAudio {
  id: string;
  nome: string;
  audio_url: string;
}

type Accent = 'red' | 'green';

const ACCENTS: Record<Accent, { grip: string; overlay: string; icon: string; over: string }> = {
  red: {
    grip: 'text-red-500/70',
    overlay: 'bg-red-500',
    icon: 'text-red-500',
    over: 'border-red-500 bg-red-500/20 scale-105',
  },
  green: {
    grip: 'text-green-500/70',
    overlay: 'bg-green-600',
    icon: 'text-green-500',
    over: 'border-green-500 bg-green-500/20 scale-105',
  },
};

interface AudioDndZoneProps {
  accent?: Accent;
  onSendToStage: (audio: DragAudio, stageId: string) => void;
  onMoveToFolder: (audio: DragAudio, folderId: string | null) => void;
  children: ReactNode;
}

interface HandleProps {
  ref: (el: HTMLElement | null) => void;
  [key: string]: unknown;
}

const RowCtx = createContext<{ accent: Accent } | null>(null);

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

export function DragHandle({ handleProps, className }: { handleProps: HandleProps; className?: string }) {
  const ctx = useContext(RowCtx);
  const accent = ctx?.accent ?? 'red';
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
      <GripVertical size={18} className={ACCENTS[accent].grip} />
    </button>
  );
}

function DropTarget({
  id,
  label,
  sub,
  icon,
  accent,
  count,
}: {
  id: string;
  label: string;
  sub?: string;
  icon: ReactNode;
  accent: Accent;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-full rounded-lg border p-2 flex items-center gap-2 transition-all',
        isOver ? ACCENTS[accent].over : 'border-border/60 bg-card/70',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-xs font-medium leading-tight truncate', isOver && 'text-foreground')}>{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
      </div>
      <span
        className={cn(
          'shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
          count > 0 ? 'bg-secondary text-foreground' : 'bg-secondary/40 text-muted-foreground',
        )}
        title={`${count} música${count === 1 ? '' : 's'} nesta lista`}
      >
        <Music size={10} />
        {count}
      </span>
    </div>
  );
}

export function AudioDndZone({ accent = 'red', onSendToStage, onMoveToFolder, children }: AudioDndZoneProps) {
  const { stages } = useStages();
  const { sections } = useSections();
  const { folders } = useAudioFolders();
  const { audiosByStageId } = useAllStageAudios();
  const { audios: libraryAudios } = useAudioLibrary();
  const [active, setActive] = useState<DragAudio | null>(null);

  const folderCounts = libraryAudios.reduce((acc, a) => {
    const key = (a as { pasta_id?: string | null }).pasta_id ?? 'null';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const stageCount = (id: string) => audiosByStageId[id]?.length ?? 0;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showTargets, setShowTargets] = useState(true);

  const toggleGroup = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

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
  const acc = ACCENTS[accent];

  return (
    <RowCtx.Provider value={{ accent }}>
      <DndContext sensors={sensors} onDragStart={handleStart} onDragEnd={handleEnd} onDragCancel={() => setActive(null)}>
        {children}

        <DragOverlay dropAnimation={null}>
          {active ? (
            <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-white shadow-2xl max-w-[240px]', acc.overlay)}>
              <Music size={16} />
              <span className="text-sm font-medium truncate">{active.nome}</span>
            </div>
          ) : null}
        </DragOverlay>

        {active && (
          <div className="fixed right-0 top-0 z-40 h-full w-64 max-w-[80vw] border-l border-border bg-background/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-right flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-border p-3">
              <p className="text-xs font-semibold text-foreground">Solte em uma etapa ou pasta</p>
              <button
                type="button"
                onClick={() => setShowTargets((s) => !s)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                title={showTargets ? 'Ocultar' : 'Mostrar seções'}
              >
                <PanelRightClose size={16} />
              </button>
            </div>

            {showTargets && (
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {/* Pastas */}
                {folders.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleGroup('__folders')}
                      className="flex w-full items-center gap-1 px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {collapsed['__folders'] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      <Folder size={13} className={acc.icon} />
                      Pastas
                    </button>
                    {!collapsed['__folders'] && (
                      <div className="space-y-1.5 pl-1 pt-1">
                        {folders.map((f) => (
                          <DropTarget
                            key={f.id}
                            id={`folder:${f.id}`}
                            label={f.nome}
                            sub="Pasta"
                            accent={accent}
                            icon={<Folder size={16} className={acc.icon} />}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Seções com etapas */}
                {stagesBySection.map(({ section, stages: ss }) =>
                  ss.length === 0 ? null : (
                    <div key={section.id}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(section.id)}
                        className="flex w-full items-center gap-1 px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {collapsed[section.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        <Layers size={13} className={acc.icon} />
                        <span className="truncate">{section.nome}</span>
                      </button>
                      {!collapsed[section.id] && (
                        <div className="space-y-1.5 pl-1 pt-1">
                          {ss.map((stage) => (
                            <DropTarget
                              key={stage.id}
                              id={`stage:${stage.id}`}
                              label={stage.nome_simbolico}
                              sub={section.nome}
                              accent={accent}
                              icon={<Layers size={16} className={acc.icon} />}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                )}

                {/* Etapas sem seção */}
                {unassignedStages.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleGroup('__unassigned')}
                      className="flex w-full items-center gap-1 px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {collapsed['__unassigned'] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      <Layers size={13} className={acc.icon} />
                      Sem seção
                    </button>
                    {!collapsed['__unassigned'] && (
                      <div className="space-y-1.5 pl-1 pt-1">
                        {unassignedStages.map((stage) => (
                          <DropTarget
                            key={stage.id}
                            id={`stage:${stage.id}`}
                            label={stage.nome_simbolico}
                            sub="Sem seção"
                            accent={accent}
                            icon={<Layers size={16} className={acc.icon} />}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DndContext>
    </RowCtx.Provider>
  );
}
