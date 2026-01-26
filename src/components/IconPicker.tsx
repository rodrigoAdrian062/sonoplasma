import { useState, useRef } from 'react';
import { Upload, X, Crop, Loader2, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { ImageCropModal } from './ImageCropModal';
import { ICON_OPTIONS } from '@/types/ceremony';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Import gallery images
import galleryChalice from '@/assets/gallery/chalice.jpg';
import galleryCandle from '@/assets/gallery/candle.jpg';
import galleryLotus from '@/assets/gallery/lotus.jpg';
import galleryMoon from '@/assets/gallery/moon.jpg';
import gallerySun from '@/assets/gallery/sun.jpg';
import galleryFeather from '@/assets/gallery/feather.jpg';
import galleryCrystal from '@/assets/gallery/crystal.jpg';
import galleryEye from '@/assets/gallery/eye.jpg';
import galleryTree from '@/assets/gallery/tree.jpg';
import gallerySpiral from '@/assets/gallery/spiral.jpg';

const GALLERY_IMAGES = [
  { src: galleryChalice, label: 'Cálice' },
  { src: galleryCandle, label: 'Vela' },
  { src: galleryLotus, label: 'Lótus' },
  { src: galleryMoon, label: 'Lua' },
  { src: gallerySun, label: 'Sol' },
  { src: galleryFeather, label: 'Pena' },
  { src: galleryCrystal, label: 'Cristal' },
  { src: galleryEye, label: 'Olho' },
  { src: galleryTree, label: 'Árvore' },
  { src: gallerySpiral, label: 'Espiral' },
];

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
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gallery' | 'icons' | 'upload'>('gallery');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setTempImageSrc(imageUrl);
    setShowCropModal(true);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropModal(false);
    setIsUploading(true);

    try {
      const fileName = `icon-${Date.now()}.jpg`;
      const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });

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
      if (tempImageSrc) {
        URL.revokeObjectURL(tempImageSrc);
        setTempImageSrc(null);
      }
    }
  };

  const handleCropModalClose = () => {
    setShowCropModal(false);
    if (tempImageSrc) {
      URL.revokeObjectURL(tempImageSrc);
      setTempImageSrc(null);
    }
  };

  const handleGallerySelect = (imageSrc: string) => {
    onIconUrlChange(imageSrc);
  };

  const handleRemoveImage = () => {
    onIconUrlChange(null);
  };

  const isGalleryImage = iconUrl && GALLERY_IMAGES.some(img => img.src === iconUrl);

  return (
    <div className="space-y-4">
      <Label>Ícone da Etapa</Label>
      
      {/* Current Selection Preview */}
      {iconUrl && (
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-gold/30">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex items-center justify-center">
            <img 
              src={iconUrl} 
              alt="Ícone selecionado" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {isGalleryImage ? 'Imagem da galeria' : 'Imagem personalizada'}
            </p>
            <p className="text-xs text-muted-foreground">Clique no X para remover</p>
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
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('gallery')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all',
            activeTab === 'gallery'
              ? 'bg-gold text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <ImageIcon size={14} />
          Galeria
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('icons')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all',
            activeTab === 'icons'
              ? 'bg-gold text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <CeremonyIcon name="flame" size={14} />
          Ícones
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all',
            activeTab === 'upload'
              ? 'bg-gold text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <Upload size={14} />
          Enviar
        </button>
      </div>

      {/* Gallery Tab */}
      {activeTab === 'gallery' && (
        <div className="grid grid-cols-5 gap-2 animate-fade-in">
          {GALLERY_IMAGES.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleGallerySelect(image.src)}
              className={cn(
                'aspect-square rounded-xl border overflow-hidden transition-all duration-200 hover:scale-105',
                iconUrl === image.src
                  ? 'ring-2 ring-gold ring-offset-2 ring-offset-background border-gold'
                  : 'border-border hover:border-gold/50'
              )}
              title={image.label}
            >
              <img 
                src={image.src} 
                alt={image.label} 
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Icons Tab */}
      {activeTab === 'icons' && (
        <div className="grid grid-cols-5 gap-2 animate-fade-in">
          {ICON_OPTIONS.map((icon) => (
            <button
              key={icon.value}
              type="button"
              onClick={() => {
                onIconChange(icon.value);
                if (iconUrl) onIconUrlChange(null);
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
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="animate-fade-in">
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
                <Crop size={20} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">
                {isUploading ? 'Enviando...' : 'Enviar e recortar imagem'}
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG até 5MB • Recorte quadrado</p>
            </div>
            <Upload size={16} className="text-muted-foreground" />
          </button>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Crop Modal */}
      {tempImageSrc && (
        <ImageCropModal
          isOpen={showCropModal}
          imageSrc={tempImageSrc}
          onClose={handleCropModalClose}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}