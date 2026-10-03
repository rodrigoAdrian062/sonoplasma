import { useEffect, useRef } from 'react';
import { Bold, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeRitualDetails } from '@/lib/ritualDetails';
import { cn } from '@/lib/utils';

const RITUAL_COLORS = [
  { name: 'Dourado', value: '#D4AF37' },
  { name: 'Branco', value: '#FFFFFF' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Roxo', value: '#A855F7' },
];

export function RitualDetailsDisplay({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const safeHtml = sanitizeRitualDetails(value);
  const hasContent = safeHtml.replace(/<[^>]*>/g, '').trim().length > 0;

  return hasContent ? (
    <div
      className={cn('whitespace-pre-wrap [&_p]:my-1', className)}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  ) : null;
}

export function RitualDetailsEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 80,
  compact = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  minHeight?: number;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor === document.activeElement) return;
    const safeHtml = sanitizeRitualDetails(value);
    if (editor.innerHTML !== safeHtml) editor.innerHTML = safeHtml;
    editor.dataset.empty = String(editor.textContent?.trim().length === 0);
    if (autoFocus) editor.focus();
  }, [autoFocus, value]);

  const applyCommand = (command: 'bold' | 'underline' | 'foreColor', color?: string) => {
    editorRef.current?.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, color);
    if (editorRef.current) onChange(sanitizeRitualDetails(editorRef.current.innerHTML));
  };

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border/50 bg-background/50', className)}>
      <div
        className={cn(
          'flex flex-wrap items-center gap-1 border-b border-border/50 p-1.5',
          compact && 'gap-0.5 p-1',
        )}
        role="toolbar"
        aria-label="Formatação dos detalhes do ritual"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={compact ? 'h-7 w-7' : 'h-8 w-8'}
          title="Negrito"
          aria-label="Aplicar negrito ao texto selecionado"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand('bold')}
        >
          <Bold size={compact ? 14 : 16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={compact ? 'h-7 w-7' : 'h-8 w-8'}
          title="Sublinhado"
          aria-label="Sublinhar o texto selecionado"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand('underline')}
        >
          <Underline size={compact ? 14 : 16} />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {RITUAL_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            className={cn(
              'rounded-full border border-foreground/20 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
              compact ? 'h-5 w-5' : 'h-6 w-6',
            )}
            style={{ backgroundColor: color.value }}
            title={`Cor ${color.name}`}
            aria-label={`Aplicar cor ${color.name} ao texto selecionado`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand('foreColor', color.value)}
          />
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Detalhes formatados do ritual"
        aria-multiline="true"
        data-placeholder={placeholder}
        className={cn(
          'ritual-rich-editor w-full overflow-y-auto p-3 text-sm text-foreground outline-none data-[empty=true]:before:pointer-events-none data-[empty=true]:before:text-muted-foreground/50 data-[empty=true]:before:content-[attr(data-placeholder)]',
          compact && 'p-2 text-xs',
        )}
        data-empty="true"
        style={{ minHeight }}
        onInput={(event) => {
          event.currentTarget.dataset.empty = String(event.currentTarget.textContent?.trim().length === 0);
          onChange(sanitizeRitualDetails(event.currentTarget.innerHTML));
        }}
        onBlur={(event) => {
          const safeHtml = sanitizeRitualDetails(event.currentTarget.innerHTML);
          if (event.currentTarget.innerHTML !== safeHtml) event.currentTarget.innerHTML = safeHtml;
          event.currentTarget.dataset.empty = String(event.currentTarget.textContent?.trim().length === 0);
          onChange(safeHtml);
        }}
      />
    </div>
  );
}
