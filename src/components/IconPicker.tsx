import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { ICON_OPTIONS } from '@/types/ceremony';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface IconPickerProps {
  selectedIcon: string;
  iconUrl: string | null;
  onIconChange: (icon: string) => void;
  onIconUrlChange: (url: string | null) => void;
}

export function IconPicker({
  selectedIcon,
  iconUrl,
  onIconChange,
  onIconUrlChange,
}: IconPickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `icon-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('stage-icons')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stage-icons')
        .getPublicUrl(fileName);

      onIconUrlChange(publicUrl);
      toast.success('Imagem enviada com sucesso');
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onIconUrlChange(null);
  };

  return (
    <div className="space-y-4">
      <Label>Ícone da Etapa</Label>
      
      {/* Image Upload Section */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Envie uma imagem personalizada ou escolha um ícone abaixo:
        </p>
        
        {iconUrl ? (
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex items-center justify-center">
              <img 
                src={iconUrl} 
                alt="Ícone personalizado" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Imagem personalizada</p>
              <p className="text-xs text-muted-foreground">Clique para remover</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemoveImage}
              className="text-muted-foreground hover:text-destructive"
            >
              <X size={18} />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-lg border-2 border-dashed transition-all',
              isUploading
                ? 'border-gold/50 bg-gold/5 cursor-wait'
                : 'border-border hover:border-gold/50 hover:bg-secondary/50 cursor-pointer'
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              {isUploading ? (
                <Loader2 size={20} className="text-gold animate-spin" />
              ) : (
                <ImageIcon size={20} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">
                {isUploading ? 'Enviando...' : 'Enviar imagem'}
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG até 2MB</p>
            </div>
            <Upload size={16} className="text-muted-foreground" />
          </button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">ou escolha um ícone</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Icon Grid */}
      <div className="grid grid-cols-5 gap-2">
        {ICON_OPTIONS.map((icon) => (
          <button
            key={icon.value}
            type="button"
            onClick={() => {
              onIconChange(icon.value);
              if (iconUrl) onIconUrlChange(null); // Clear image when selecting icon
            }}
            className={cn(
              'aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-200 hover:scale-105',
              !iconUrl && selectedIcon === icon.value
                ? 'bg-gold/20 border-gold text-gold shadow-lg shadow-gold/20'
                : 'bg-secondary border-border text-muted-foreground hover:border-gold/50'
            )}
            title={icon.label}
          >
            <CeremonyIcon name={icon.value} size={24} />
            <span className="text-[10px] truncate w-full px-1">{icon.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
