import { Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CeremonySection } from '@/types/section';

interface Props {
  sections: CeremonySection[];
  currentSectionId: string;
  onCopy: (targetSectionId: string) => void;
}

export function CopyStageMenu({ sections, currentSectionId, onCopy }: Props) {
  const others = sections.filter((s) => s.id !== currentSectionId);
  if (others.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-1.5 text-muted-foreground/60 hover:text-emerald-500 transition-colors rounded-md hover:bg-emerald-500/10"
          aria-label="Copiar etapa para outra seção"
          title="Copiar para outra seção"
          onClick={(e) => e.stopPropagation()}
        >
          <Copy size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto">
        <DropdownMenuLabel className="text-xs">Copiar para…</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {others.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onClick={(e) => {
              e.stopPropagation();
              onCopy(s.id);
            }}
            className="text-xs cursor-pointer"
          >
            {s.nome}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
