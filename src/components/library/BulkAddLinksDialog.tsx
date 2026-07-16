import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, X, CheckCircle2, AlertCircle, ClipboardPaste } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { AudioLibraryItem, AudioLibraryInsert } from '@/types/audioLibrary';

type Status = 'pending' | 'fetching' | 'ready' | 'invalid' | 'duplicate' | 'adding' | 'done' | 'error';

type Row = {
  id: string;
  url: string;
  title: string;
  status: Status;
  message?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: 'youtube' | 'spotify';
  isValidUrl: (url: string) => boolean;
  existingUrls: string[];
  addAudio: (input: AudioLibraryInsert) => Promise<AudioLibraryItem | unknown>;
};

const PLATFORM_META = {
  youtube: {
    label: 'YouTube',
    accent: 'text-red-500',
    button: 'bg-red-500 hover:bg-red-500/90 text-white',
    border: 'border-red-500/40',
    tipo: 'youtube' as const,
    placeholder: 'Cole aqui vários links do YouTube (um por linha)…\n\nhttps://youtube.com/watch?v=...\nhttps://youtu.be/...\nhttps://youtube.com/watch?v=... — Nome opcional',
  },
  spotify: {
    label: 'Spotify',
    accent: 'text-[#1DB954]',
    button: 'bg-[#1DB954] hover:bg-[#1DB954]/90 text-black',
    border: 'border-[#1DB954]/40',
    tipo: 'spotify' as const,
    placeholder: 'Cole aqui vários links do Spotify (um por linha)…\n\nhttps://open.spotify.com/track/...\nhttps://open.spotify.com/track/... — Nome opcional',
  },
};

function normalize(url: string): string {
  const u = (url || '').trim().toLowerCase();
  const yt = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-z0-9_-]{11})/i);
  if (yt) return `yt:${yt[1]}`;
  const sp = u.match(/(?:spotify[:/])+(track|album|playlist|episode|show)[:/]([a-z0-9]+)/i);
  if (sp) return `sp:${sp[1]}:${sp[2]}`;
  return u.replace(/[?#].*$/, '').replace(/\/+$/, '');
}

// Extrai URL e nome opcional de uma linha "https://... — Nome" ou "Nome — https://..."
function parseLine(line: string): { url: string; hint?: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/https?:\/\/\S+|spotify:\S+/i);
  if (!urlMatch) return null;
  const url = urlMatch[0].replace(/[)\]},.;]+$/, '');
  const rest = trimmed.replace(url, '').replace(/^[\s\-–—|:]+|[\s\-–—|:]+$/g, '').trim();
  return { url, hint: rest || undefined };
}

// Busca título via noembed.com (CORS-enabled, suporta YouTube e Spotify).
async function fetchTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.title === 'string') return data.title.trim();
    return null;
  } catch {
    return null;
  }
}

export function BulkAddLinksDialog({
  open,
  onOpenChange,
  platform,
  isValidUrl,
  existingUrls,
  addAudio,
}: Props) {
  const meta = PLATFORM_META[platform];
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [fetching, setFetching] = useState(false);
  const [adding, setAdding] = useState(false);

  const existingSet = useMemo(() => new Set(existingUrls.map(normalize)), [existingUrls]);

  const reset = () => {
    setRaw('');
    setRows([]);
    setFetching(false);
    setAdding(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRaw((prev) => (prev.trim() ? prev + '\n' + text : text));
    } catch {
      toast({ title: 'Não foi possível ler a área de transferência', variant: 'destructive' });
    }
  };

  const handleDetect = async () => {
    const lines = raw.split(/\r?\n/).map(parseLine).filter(Boolean) as { url: string; hint?: string }[];
    if (lines.length === 0) {
      toast({ title: 'Nenhum link detectado', description: 'Cole ao menos uma URL válida.', variant: 'destructive' });
      return;
    }
    // Dedup within paste
    const seen = new Set<string>();
    const initial: Row[] = [];
    for (const { url, hint } of lines) {
      const key = normalize(url);
      if (seen.has(key)) continue;
      seen.add(key);
      const valid = isValidUrl(url);
      const dup = existingSet.has(key);
      initial.push({
        id: crypto.randomUUID(),
        url,
        title: hint || '',
        status: !valid ? 'invalid' : dup ? 'duplicate' : hint ? 'ready' : 'pending',
        message: !valid ? 'Link inválido' : dup ? 'Já está na biblioteca' : undefined,
      });
    }
    setRows(initial);
    setFetching(true);

    // Busca títulos em paralelo (limitado a 5 concorrentes)
    const queue = initial.filter((r) => r.status === 'pending');
    const CONCURRENCY = 5;
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const item = queue[cursor++];
        setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: 'fetching' } : r)));
        const title = await fetchTitle(item.url);
        setRows((prev) => prev.map((r) => {
          if (r.id !== item.id) return r;
          if (title) return { ...r, title, status: 'ready' };
          return { ...r, status: 'ready', title: r.title || (platform === 'youtube' ? 'Vídeo do YouTube' : 'Faixa do Spotify') };
        }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    setFetching(false);
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const updateTitle = (id: string, title: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, title } : r)));

  const addableRows = rows.filter((r) => r.status === 'ready' && r.title.trim());

  const handleAddAll = async () => {
    if (addableRows.length === 0) return;
    setAdding(true);
    let ok = 0;
    let fail = 0;
    for (const row of addableRows) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'adding' } : r)));
      try {
        await addAudio({ nome: row.title.trim(), audio_url: row.url.trim(), tipo: meta.tipo });
        ok++;
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'done' } : r)));
      } catch (e: any) {
        fail++;
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'error', message: e?.message || 'Erro' } : r)));
      }
    }
    setAdding(false);
    toast({
      title: `${ok} adicionada(s)${fail ? `, ${fail} com erro` : ''}`,
      description: fail === 0 ? 'Tudo pronto!' : undefined,
    });
    if (fail === 0) {
      setTimeout(() => handleClose(false), 600);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className={meta.accent} />
            Colar vários links do {meta.label}
          </DialogTitle>
          <DialogDescription>
            Cole quantos links quiser (um por linha). O sistema busca o título de cada faixa automaticamente.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-3 flex-1 min-h-0 flex flex-col">
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={meta.placeholder}
              className="min-h-[220px] flex-1 font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePasteClipboard} className="gap-2">
                <ClipboardPaste size={14} />
                Colar da área de transferência
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
            {rows.map((row, i) => {
              const disabled = row.status === 'invalid' || row.status === 'duplicate' || row.status === 'done';
              return (
                <div
                  key={row.id}
                  className={cn(
                    'border rounded-md p-2 flex items-start gap-2 text-sm transition-colors',
                    row.status === 'invalid' || row.status === 'error'
                      ? 'border-destructive/50 bg-destructive/5'
                      : row.status === 'duplicate'
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : row.status === 'done'
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-border',
                  )}
                >
                  <div className="w-5 pt-2 text-xs tabular-nums text-muted-foreground text-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <Input
                      value={row.title}
                      onChange={(e) => updateTitle(row.id, e.target.value)}
                      placeholder={row.status === 'fetching' ? 'Buscando título…' : 'Título da faixa'}
                      disabled={disabled || row.status === 'fetching' || row.status === 'adding'}
                      className="h-8 text-sm"
                    />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      {row.status === 'fetching' && <Loader2 size={12} className="animate-spin shrink-0" />}
                      {row.status === 'ready' && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                      {row.status === 'done' && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                      {(row.status === 'invalid' || row.status === 'duplicate' || row.status === 'error') && (
                        <AlertCircle size={12} className={cn('shrink-0', row.status === 'duplicate' ? 'text-amber-500' : 'text-destructive')} />
                      )}
                      <span className="truncate">{row.message || row.url}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeRow(row.id)}
                    disabled={row.status === 'adding'}
                  >
                    <X size={14} />
                  </Button>
                </div>
              );
            })}
            {fetching && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 size={14} className="animate-spin" />
                Buscando títulos…
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          {rows.length === 0 ? (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button
                onClick={handleDetect}
                disabled={!raw.trim()}
                className={meta.button}
              >
                <Sparkles size={14} className="mr-2" />
                Detectar links e títulos
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setRows([])} disabled={adding}>
                Voltar
              </Button>
              <Button
                onClick={handleAddAll}
                disabled={adding || fetching || addableRows.length === 0}
                className={meta.button}
              >
                {adding ? (
                  <><Loader2 size={14} className="mr-2 animate-spin" /> Adicionando…</>
                ) : (
                  `Adicionar ${addableRows.length} à biblioteca`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
