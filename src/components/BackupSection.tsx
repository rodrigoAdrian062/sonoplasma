import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, Upload, Loader2, DatabaseBackup } from 'lucide-react';
import { toast } from 'sonner';
import { exportBackup, downloadBackup, importBackup, BackupData } from '@/lib/backup';
import { useQueryClient } from '@tanstack/react-query';

export function BackupSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportBackup();
      downloadBackup(data);
      toast.success('Backup exportado com sucesso.');
    } catch (e: any) {
      toast.error('Erro ao exportar', { description: e.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Importar este backup? Os dados serão adicionados aos existentes (nada será apagado).')) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      const res = await importBackup(data);
      await queryClient.invalidateQueries();
      toast.success('Backup importado', {
        description: `${res.secoes} seções, ${res.etapas} etapas, ${res.biblioteca} músicas restauradas.`,
      });
    } catch (err: any) {
      toast.error('Erro ao importar', { description: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-2 border-t border-border pt-5">
      <Label className="flex items-center gap-2">
        <DatabaseBackup size={16} className="text-gold" />
        Backup dos dados
      </Label>
      <p className="text-xs text-muted-foreground">
        Baixe uma cópia de segurança (seções, etapas, músicas e faixas) ou restaure a partir de um arquivo.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 justify-start"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2 text-gold" />}
          Exportar backup
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 justify-start"
          onClick={() => fileRef.current?.click()}
          disabled={isImporting}
        >
          {isImporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Upload size={16} className="mr-2 text-gold" />}
          Importar backup
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  );
}
