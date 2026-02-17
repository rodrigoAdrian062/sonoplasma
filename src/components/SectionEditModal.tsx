import { useState, useEffect } from 'react';
import { Save, FolderPlus, Type, FileText } from 'lucide-react';
import { CeremonySection, CeremonySectionInsert, CeremonySectionUpdate } from '@/types/section';
import { suggestIconForName } from '@/types/ceremony';
import { IconPicker } from './IconPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SectionEditModalProps {
  section: CeremonySection | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CeremonySectionInsert | CeremonySectionUpdate) => void;
  isNew?: boolean;
  existingSectionsCount?: number;
}

export function SectionEditModal({ 
  section, 
  isOpen, 
  onClose, 
  onSave, 
  isNew = false,
  existingSectionsCount = 0 
}: SectionEditModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    icone: 'folder',
    icone_url: null as string | null,
  });

  useEffect(() => {
    if (section) {
      setFormData({
        nome: section.nome,
        descricao: section.descricao || '',
        icone: section.icone || 'folder',
        icone_url: (section as any).icone_url || null,
      });
    } else if (isNew) {
      setFormData({
        nome: '',
        descricao: '',
        icone: 'folder',
        icone_url: null,
      });
    }
  }, [section, isNew, isOpen]);

  const handleSubmit = () => {
    if (!formData.nome.trim()) {
      toast.error('Digite o nome da seção');
      return;
    }

    const data: any = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      icone: formData.icone,
      icone_url: formData.icone_url,
    };

    if (isNew) {
      data.ordem = existingSectionsCount + 1;
      data.ativo = true;
    }

    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md w-[calc(100%-1rem)] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg sm:text-xl text-foreground flex items-center gap-2">
            {isNew ? (
              <>
                <FolderPlus className="text-gold" size={20} />
                Nova Seção
              </>
            ) : (
              'Editar Seção'
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Type size={14} className="text-gold" />
              Nome da Seção
            </Label>
            <Input
              value={formData.nome}
              onChange={(e) => {
                const nome = e.target.value;
                const suggested = suggestIconForName(nome);
                setFormData({ ...formData, nome, icone: suggested });
              }}
              placeholder="Ex: Sessão de Aprendiz"
              required
              autoFocus
              className="bg-secondary border-border text-foreground text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText size={14} className="text-muted-foreground" />
              Descrição (opcional)
            </Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Breve descrição da seção..."
              rows={2}
              className="bg-secondary border-border text-foreground resize-none"
            />
          </div>

          {/* Icon Selection - using IconPicker */}
          <IconPicker
            selectedIcon={formData.icone}
            iconUrl={formData.icone_url}
            onIconChange={(icon) => setFormData({ ...formData, icone: icon })}
            onIconUrlChange={(url) => setFormData({ ...formData, icone_url: url })}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-gold hover:bg-gold-glow text-background gap-2"
            >
              <Save size={18} />
              {isNew ? 'Criar Seção' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
