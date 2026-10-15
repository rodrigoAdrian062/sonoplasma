import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Bold, Underline, Plus, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
const HARMONY_LABEL_MAX_LENGTH = 40;

function createHarmonyMarkerId(): string {
  return `ritual-harmony-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface RitualHarmonyAudio {
  nome: string;
  audio_url: string;
}

export function RitualDetailsDisplay({
  value,
  className,
  onHarmonyPlay,
}: {
  value: string;
  className?: string;
  onHarmonyPlay?: (audioUrl: string) => void;
}) {
  const safeHtml = sanitizeRitualDetails(value);
  const hasContent = safeHtml.replace(/<[^>]*>/g, '').trim().length > 0;

  return hasContent ? (
    <div
      className={cn('whitespace-pre-wrap [&_p]:my-1', className)}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
      onClick={(event) => {
        const marker = (event.target as HTMLElement).closest<HTMLElement>('[data-ritual-harmony]');
        const audioUrl = marker?.dataset.ritualHarmony;
        if (!audioUrl) return;
        event.stopPropagation();
        onHarmonyPlay?.(audioUrl);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const marker = (event.target as HTMLElement).closest<HTMLElement>('[data-ritual-harmony]');
        const audioUrl = marker?.dataset.ritualHarmony;
        if (!audioUrl) return;
        event.preventDefault();
        event.stopPropagation();
        onHarmonyPlay?.(audioUrl);
      }}
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
  onRequestAddHarmony,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  minHeight?: number;
  compact?: boolean;
  autoFocus?: boolean;
  onRequestAddHarmony?: (onSelected: (audio: RitualHarmonyAudio) => void) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRangeRef = useRef<Range | null>(null);
  const [contextMenu, setContextMenu] = useState<{ left: number; top: number } | null>(null);
  const harmonyMarkerRef = useRef<HTMLElement | null>(null);
  const harmonyMarkerIdRef = useRef<string | null>(null);
  const harmonyLabelInputRef = useRef<HTMLInputElement>(null);
  const [harmonyMarkerMenu, setHarmonyMarkerMenu] = useState<{ left: number; top: number } | null>(null);
  const [harmonyLabel, setHarmonyLabel] = useState('');

  useEffect(() => {
    if (harmonyMarkerMenu) harmonyLabelInputRef.current?.focus();
  }, [harmonyMarkerMenu]);

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

  const setHarmonyTarget = (range: Range, clientX: number, clientY: number) => {
    const editor = editorRef.current;
    const container = containerRef.current;
    if (!editor || !container) return;

    if (
      range.collapsed &&
      range.startContainer.nodeType === Node.TEXT_NODE &&
      range.startOffset < (range.startContainer.textContent?.length ?? 0)
    ) {
      range.setEnd(range.startContainer, range.startOffset + 1);
    }

    targetRangeRef.current = range.cloneRange();
    const containerRect = container.getBoundingClientRect();
    setContextMenu({
      left: Math.max(4, Math.min(clientX - containerRect.left, containerRect.width - 170)),
      top: Math.max(4, clientY - containerRect.top - 38),
    });
  };

  const captureHarmonyTarget = (clientX: number, clientY: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selected = window.getSelection();
    if (
      selected &&
      !selected.isCollapsed &&
      selected.anchorNode &&
      selected.focusNode &&
      editor.contains(selected.anchorNode) &&
      editor.contains(selected.focusNode)
    ) {
      setHarmonyTarget(selected.getRangeAt(0), clientX, clientY);
      return;
    }

    let range = document.caretRangeFromPoint?.(clientX, clientY) ?? null;
    if (!range) {
      const position = document.caretPositionFromPoint?.(clientX, clientY);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }
    if (!range || !editor.contains(range.startContainer)) return;
    if ((range.startContainer.parentElement?.closest('[data-ritual-harmony]'))) return;
    setHarmonyTarget(range, clientX, clientY);
  };

  const insertHarmonyMarker = (audio: RitualHarmonyAudio) => {
    const editor = editorRef.current;
    const range = targetRangeRef.current;
    if (!editor || !range || !editor.contains(range.startContainer)) return;

    const marker = document.createElement('span');
    marker.className = 'ritual-harmony-marker';
    marker.setAttribute('role', 'button');
    marker.setAttribute('tabindex', '0');
    marker.setAttribute('contenteditable', 'false');
    marker.setAttribute('data-ritual-harmony', audio.audio_url);
    marker.setAttribute('data-ritual-harmony-name', audio.nome);
    marker.setAttribute('data-ritual-harmony-id', createHarmonyMarkerId());
    const label = audio.nome.trim().slice(0, HARMONY_LABEL_MAX_LENGTH);
    if (label) marker.setAttribute('data-ritual-harmony-label', label);
    marker.setAttribute('title', `Reproduzir ${label || audio.nome}`);
    marker.textContent = label ? `${label} ▶` : '▶';

    range.deleteContents();
    range.insertNode(marker);
    range.setStartAfter(marker);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.focus();
    editor.dataset.empty = String(editor.textContent?.trim().length === 0);
    onChange(sanitizeRitualDetails(editor.innerHTML));
    targetRangeRef.current = null;
    setContextMenu(null);
  };

  const handleEditorClick = (event: MouseEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    const marker = (event.target as HTMLElement).closest<HTMLElement>('[data-ritual-harmony]');
    if (editor && marker && editor.contains(marker)) {
      event.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      if (!marker.dataset.ritualHarmonyId) {
        marker.dataset.ritualHarmonyId = createHarmonyMarkerId();
      }
      harmonyMarkerRef.current = marker;
      harmonyMarkerIdRef.current = marker.dataset.ritualHarmonyId;
      setHarmonyLabel(marker.dataset.ritualHarmonyLabel || '');
      const containerRect = container.getBoundingClientRect();
      const markerRect = marker.getBoundingClientRect();
      setHarmonyMarkerMenu({
        left: Math.max(4, Math.min(markerRect.left - containerRect.left, containerRect.width - 280)),
        top: Math.max(4, markerRect.top - containerRect.top - 48),
      });
      setContextMenu(null);
      return;
    }
    setHarmonyMarkerMenu(null);
    harmonyMarkerRef.current = null;
    harmonyMarkerIdRef.current = null;
    captureHarmonyTarget(event.clientX, event.clientY);
  };

  const findHarmonyMarker = (): HTMLElement | null => {
    const editor = editorRef.current;
    if (!editor) return null;
    if (harmonyMarkerRef.current?.isConnected) return harmonyMarkerRef.current;
    const markerId = harmonyMarkerIdRef.current;
    if (!markerId) return null;
    return Array.from(editor.querySelectorAll<HTMLElement>('[data-ritual-harmony-id]'))
      .find((marker) => marker.dataset.ritualHarmonyId === markerId) ?? null;
  };

  const closeHarmonyMarkerMenu = () => {
    harmonyMarkerRef.current = null;
    harmonyMarkerIdRef.current = null;
    setHarmonyMarkerMenu(null);
  };

  const saveHarmonyMarkerLabel = () => {
    const editor = editorRef.current;
    const marker = findHarmonyMarker();
    if (!editor || !marker) {
      closeHarmonyMarkerMenu();
      return;
    }

    const label = harmonyLabel.trim().slice(0, HARMONY_LABEL_MAX_LENGTH);
    if (label) marker.dataset.ritualHarmonyLabel = label;
    else delete marker.dataset.ritualHarmonyLabel;
    const trackName = marker.dataset.ritualHarmonyName || 'Harmonia';
    marker.title = `Reproduzir ${label || trackName}`;
    marker.textContent = label ? `${label} ▶` : '▶';
    editor.dataset.empty = String(editor.textContent?.trim().length === 0);
    onChange(sanitizeRitualDetails(editor.innerHTML));
    closeHarmonyMarkerMenu();
  };

  const deleteHarmonyMarker = () => {
    const editor = editorRef.current;
    const marker = findHarmonyMarker();
    if (!editor || !marker) {
      closeHarmonyMarkerMenu();
      return;
    }

    marker.remove();
    editor.dataset.empty = String(editor.textContent?.trim().length === 0);
    onChange(sanitizeRitualDetails(editor.innerHTML));
    closeHarmonyMarkerMenu();
    editor.focus();
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative rounded-lg border border-border/50 bg-background/50', className)}
      onMouseLeave={() => setContextMenu(null)}
    >
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
        onMouseMove={(event) => captureHarmonyTarget(event.clientX, event.clientY)}
        onMouseUp={(event) => captureHarmonyTarget(event.clientX, event.clientY)}
        onClick={handleEditorClick}
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
      {contextMenu && onRequestAddHarmony && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute z-10 h-8 gap-1 border border-gold/30 bg-card px-2 text-xs text-gold shadow-lg hover:bg-gold/10"
          style={{ left: contextMenu.left, top: contextMenu.top }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onRequestAddHarmony(insertHarmonyMarker)}
        >
          <Plus size={13} />
          Adicionar harmonia
        </Button>
      )}
      {harmonyMarkerMenu && (
        <div
          className="absolute z-20 flex w-[min(280px,calc(100%-8px))] items-center gap-1.5 rounded-lg border border-gold/30 bg-card p-1.5 shadow-xl"
          style={{ left: harmonyMarkerMenu.left, top: harmonyMarkerMenu.top }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <Input
            ref={harmonyLabelInputRef}
            value={harmonyLabel}
            maxLength={HARMONY_LABEL_MAX_LENGTH}
            onChange={(event) => setHarmonyLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                saveHarmonyMarkerLabel();
              }
              if (event.key === 'Escape') closeHarmonyMarkerMenu();
            }}
            placeholder="Nome do botão"
            aria-label="Nome do botão de harmonia"
            className="h-8 min-w-0 border-border bg-secondary text-xs"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-gold hover:bg-gold/10"
            onClick={saveHarmonyMarkerLabel}
            title="Salvar nome do botão"
            aria-label="Salvar nome do botão"
          >
            <Check size={15} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
            onClick={deleteHarmonyMarker}
            title="Excluir botão de harmonia"
            aria-label="Excluir botão de harmonia"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
