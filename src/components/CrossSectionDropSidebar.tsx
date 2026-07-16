import { useState } from 'react';
import { useDndMonitor, useDroppable } from '@dnd-kit/core';
import { Copy, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CeremonySection } from '@/types/section';

interface Props {
  sections: CeremonySection[];
  currentSectionId: string;
  stageCounts: Record<string, number>;
}

function SectionDrop({ id, name, count }: { id: string; name: string; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `copysection:${id}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-full rounded-lg border p-2.5 flex items-center gap-2 transition-all',
        isOver
          ? 'border-emerald-500 bg-emerald-500/15 scale-[1.02] shadow-lg'
          : 'border-border/60 bg-card/70 hover:border-emerald-500/40',
      )}
    >
      <Layers size={16} className="text-emerald-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={cn('text-xs font-medium leading-tight truncate', isOver && 'text-foreground')}>
          {name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {count} etapa{count === 1 ? '' : 's'}
        </p>
      </div>
      {isOver && <Copy size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />}
    </div>
  );
}

export function CrossSectionDropSidebar({ sections, currentSectionId, stageCounts }: Props) {
  const [dragging, setDragging] = useState(false);
  useDndMonitor({
    onDragStart: () => setDragging(true),
    onDragEnd: () => setDragging(false),
    onDragCancel: () => setDragging(false),
  });

  const others = sections.filter((s) => s.id !== currentSectionId);
  if (!dragging || others.length === 0) return null;

  return (
    <div className="fixed right-0 top-0 z-40 h-full w-64 max-w-[80vw] border-l border-emerald-500/30 bg-background/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-right flex flex-col">
      <div className="border-b border-border p-3">
        <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
          <Copy size={13} /> Copiar etapa para…
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Solte em uma seção para duplicar a etapa lá.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {others.map((s) => (
          <SectionDrop key={s.id} id={s.id} name={s.nome} count={stageCounts[s.id] ?? 0} />
        ))}
      </div>
    </div>
  );
}
