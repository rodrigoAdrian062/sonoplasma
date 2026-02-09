import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stageName: string;
  title?: string;
  description?: string;
}

export function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  stageName,
  title = 'Remover Etapa',
  description,
}: DeleteConfirmModalProps) {
  const defaultDescription = `Tem certeza que deseja remover a etapa "${stageName}"? Esta ação não pode ser desfeita.`;
  const displayDescription = description || defaultDescription;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm w-[calc(100%-1rem)] sm:w-full">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="text-destructive" size={24} />
            </div>
            <DialogTitle className="font-display text-xl text-foreground">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground pt-2">
            {displayDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-border text-muted-foreground hover:bg-secondary"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Remover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
