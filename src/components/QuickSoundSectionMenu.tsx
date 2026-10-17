import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface QuickSoundSectionOption {
  id: string;
  nome: string;
}

interface QuickSoundSectionMenuProps {
  sections: QuickSoundSectionOption[];
  currentSectionId?: string;
  label: string;
  icon: ReactNode;
  onSelect: (sectionId: string) => void;
  className?: string;
  disabled?: boolean;
}

export function QuickSoundSectionMenu({
  sections,
  currentSectionId,
  label,
  icon,
  onSelect,
  className,
  disabled = false,
}: QuickSoundSectionMenuProps) {
  const availableSections = sections.filter((section) => section.id !== currentSectionId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={className}
          disabled={disabled}
          title={label}
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
        >
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {availableSections.length > 0 ? availableSections.map((section) => (
          <DropdownMenuItem
            key={section.id}
            onSelect={() => onSelect(section.id)}
          >
            {section.nome}
          </DropdownMenuItem>
        )) : (
          <DropdownMenuItem disabled>
            {currentSectionId ? 'Nenhuma outra seção disponível' : 'Nenhuma seção cadastrada'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
