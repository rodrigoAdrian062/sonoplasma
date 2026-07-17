import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, ClipboardPaste } from 'lucide-react';

interface RoteiroImportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (text: string, replace: boolean) => void;
  hasContent: boolean;
}

export function RoteiroImportDialog({ open, onOpenChange, onImport, hasContent }: RoteiroImportDialogProps) {
  const [pasted, setPasted] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data, error } = await supabase.functions.invoke('parse-roteiro', { body: form });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = (data as any)?.text || '';
      if (!text.trim()) { toast.error('Nenhum texto extraído do arquivo'); return; }
      finalize(text);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao processar arquivo');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const finalize = (text: string) => {
    const replace = hasContent
      ? window.confirm('Substituir o conteúdo atual? Cancele para adicionar ao final.')
      : true;
    onImport(text, replace);
    onOpenChange(false);
    setPasted('');
    toast.success('Texto importado');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[hsl(var(--gold))]" /> Importar Roteiro
          </DialogTitle>
          <DialogDescription>
            Suba um arquivo PDF, DOCX ou TXT — o texto será extraído automaticamente.
            Você também pode colar o texto diretamente abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-[hsl(var(--gold))]/40 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-white/70">
                <Loader2 className="w-5 h-5 animate-spin" /> Processando arquivo...
              </div>
            ) : (
              <>
                <FileText className="w-8 h-8 mx-auto text-white/40 mb-2" />
                <div className="text-sm">Clique ou arraste um arquivo aqui</div>
                <div className="text-xs text-white/50 mt-1">PDF, DOCX ou TXT</div>
              </>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase text-white/50">
              <span className="bg-background px-2">ou cole o texto</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">Texto do ritual</Label>
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Cole aqui o texto completo..."
              className="min-h-[200px] font-serif"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={() => pasted.trim() && finalize(pasted.trim())}
              disabled={!pasted.trim()}
            >
              <ClipboardPaste className="w-4 h-4 mr-1" /> Usar texto colado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
