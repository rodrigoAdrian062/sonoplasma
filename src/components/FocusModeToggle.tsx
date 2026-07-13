import { Focus } from 'lucide-react';
import { useFocusMode } from '@/contexts/FocusModeContext';
import { cn } from '@/lib/utils';

export function FocusModeToggle() {
  const { focusMode, toggleFocusMode } = useFocusMode();


  return (
    <button
      onClick={toggleFocusMode}
      title={focusMode ? 'Modo foco ativado — toque para desativar' : 'Ativar modo foco'}
      aria-label={focusMode ? 'Desativar modo foco' : 'Ativar modo foco'}
      className={cn(
        'fixed top-4 right-4 z-[60] flex items-center gap-1.5 rounded-full border p-1.5 pr-3 shadow-lg shadow-black/20 backdrop-blur-md transition-colors',
        focusMode
          ? 'border-gold/40 bg-gold/15 text-gold'
          : 'border-border bg-card/95 text-muted-foreground hover:text-gold'
      )}
    >
      <Focus size={16} />
      <span className="text-[11px] font-medium">{focusMode ? 'Foco' : 'Foco off'}</span>
    </button>
  );
}
