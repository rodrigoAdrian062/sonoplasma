import { FolderInput, Folder, Layers, Music, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { useAudioFolders } from '@/hooks/useAudioFolders';
import { useAllStageAudios } from '@/hooks/useStageAudios';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';

interface MoveTargetMenuProps {
  accentClass?: string;
  onSendToStage: (stageId: string) => void;
  onMoveToFolder: (folderId: string | null) => void;
}

function Count({ n }: { n: number }) {
  return (
    <span
      className={cn(
        'ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
        n > 0 ? 'bg-secondary text-foreground' : 'bg-secondary/40 text-muted-foreground',
      )}
    >
      <Music size={10} />
      {n}
    </span>
  );
}

export function MoveTargetMenu({ accentClass, onSendToStage, onMoveToFolder }: MoveTargetMenuProps) {
  const { stages } = useStages();
  const { sections } = useSections();
  const { folders } = useAudioFolders();
  const { audiosByStageId } = useAllStageAudios();
  const { audios: libraryAudios } = useAudioLibrary();

  const stagesBySection = sections.map((sec) => ({
    section: sec,
    stages: stages.filter((s) => s.secao_id === sec.id),
  }));
  const unassignedStages = stages.filter((s) => !s.secao_id);

  const folderCounts = libraryAudios.reduce((acc, a) => {
    const key = (a as { pasta_id?: string | null }).pasta_id ?? 'null';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const stageCount = (id: string) => audiosByStageId[id]?.length ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-9 gap-1.5 shrink-0', accentClass)}
          title="Escolher onde mover"
        >
          <FolderInput size={16} />
          <span className="hidden sm:inline">Mover</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
        {folders.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Folder size={13} /> Pastas
            </DropdownMenuLabel>
            {folders.map((f) => (
              <DropdownMenuItem key={f.id} onClick={() => onMoveToFolder(f.id)} className="gap-2">
                <Folder size={14} className="opacity-70" />
                <span className="truncate">{f.nome}</span>
                <Count n={folderCounts[f.id] ?? 0} />
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => onMoveToFolder(null)} className="gap-2 text-muted-foreground">
              <X size={14} /> Remover da pasta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {stagesBySection.map(({ section, stages: ss }) =>
          ss.length === 0 ? null : (
            <div key={section.id}>
              <DropdownMenuLabel className="flex items-center gap-1.5">
                <Layers size={13} /> {section.nome}
              </DropdownMenuLabel>
              {ss.map((stage) => (
                <DropdownMenuItem key={stage.id} onClick={() => onSendToStage(stage.id)} className="gap-2">
                  <Layers size={14} className="opacity-70" />
                  <span className="truncate">{stage.nome_simbolico}</span>
                  <Count n={stageCount(stage.id)} />
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </div>
          ),
        )}

        {unassignedStages.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Layers size={13} /> Sem seção
            </DropdownMenuLabel>
            {unassignedStages.map((stage) => (
              <DropdownMenuItem key={stage.id} onClick={() => onSendToStage(stage.id)} className="gap-2">
                <Layers size={14} className="opacity-70" />
                <span className="truncate">{stage.nome_simbolico}</span>
                <Count n={stageCount(stage.id)} />
              </DropdownMenuItem>
            ))}
          </>
        )}

        {folders.length === 0 && stages.length === 0 && (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            Nenhuma pasta ou etapa criada ainda.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
