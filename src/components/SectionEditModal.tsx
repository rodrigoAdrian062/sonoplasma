import { useState, useEffect } from 'react';
import { Save, FolderPlus, Type, FileText } from 'lucide-react';
import { CeremonySection, CeremonySectionInsert, CeremonySectionUpdate } from '@/types/section';
import { CeremonyIcon } from './icons/CeremonyIcon';
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
import { cn } from '@/lib/utils';

const SECTION_ICONS = [
  { value: 'folder', label: 'Pasta' },
  { value: 'star', label: 'Estrela' },
  { value: 'book-open', label: 'Livro' },
  { value: 'flame', label: 'Chama' },
  { value: 'compass', label: 'Compasso' },
  { value: 'eye', label: 'Olho' },
  { value: 'sun', label: 'Sol' },
  { value: 'moon', label: 'Lua' },
];

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
  });

  useEffect(() => {
    if (section) {
      setFormData({
        nome: section.nome,
        descricao: section.descricao || '',
        icone: section.icone || 'folder',
      });
    } else if (isNew) {
      setFormData({
        nome: '',
        descricao: '',
        icone: 'folder',
      });
    }
  }, [section, isNew, isOpen]);

  const handleSubmit = () => {
    if (!formData.nome.trim()) {
      toast.error('Digite o nome da seção');
      return;
    }

    const data: CeremonySectionInsert | CeremonySectionUpdate = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      icone: formData.icone,
    };

    if (isNew) {
      (data as CeremonySectionInsert).ordem = existingSectionsCount + 1;
      (data as CeremonySectionInsert).ativo = true;
    }

    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md w-[calc(100%-1rem)] sm:w-full">
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
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
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

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-4 gap-2">
              {SECTION_ICONS.map((icon) => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, icone: icon.value })}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                    formData.icone === icon.value
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'bg-secondary border-border text-muted-foreground hover:border-gold/50'
                  )}
                >
                  <CeremonyIcon name={icon.value} size={20} />
                  <span className="text-[10px]">{icon.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {formData.nome && (
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 animate-fade-in">
              <p className="text-xs text-muted-foreground mb-2">Prévia:</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <CeremonyIcon name={formData.icone} size={20} className="text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{formData.nome}</p>
                  {formData.descricao && (
                    <p className="text-xs text-muted-foreground truncate">{formData.descricao}</p>
                  )}
                </div>
              </div>
            </div>
          )}

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
