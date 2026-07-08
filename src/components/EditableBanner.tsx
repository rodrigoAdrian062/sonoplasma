import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/hooks/useSettings';
import { resizeImage } from '@/lib/imageUtils';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import masonicBanner from '@/assets/masonic-banner.png';

export function EditableBanner() {
  const { settings, updateSettings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const bannerSrc = settings?.banner_url || masonicBanner;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem.');
      return;
    }

    setIsUploading(true);
    try {
      const resized = await resizeImage(file, 1600, 600);

      if (resized.size > 3 * 1024 * 1024) {
        toast.error('Imagem muito grande, tente uma menor.');
        return;
      }

      const fileName = `banner-${Date.now()}.jpg`;

      // Remove old banner if it was uploaded to storage
      if (settings?.banner_url && settings.banner_url.includes('logos/')) {
        const oldPath = settings.banner_url.split('logos/')[1];
        if (oldPath) await supabase.storage.from('logos').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, resized, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      updateSettings.mutate({ banner_url: publicUrl });
    } catch (error) {
      console.error('Banner upload error:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative mb-6 rounded-2xl overflow-hidden border border-gold/20 shadow-lg shadow-gold/5">
      <img
        src={bannerSrc}
        alt={settings?.nome_app || 'Sonoplastia Cerimonial'}
        className="w-full h-32 sm:h-44 object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6">
        <h2 className="font-display text-lg sm:text-2xl font-bold text-gold drop-shadow-lg">
          {settings?.nome_app || 'Seções do Cerimonial'}
        </h2>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => !isUploading && fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label="Trocar imagem principal"
        className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-background/70 backdrop-blur-md border border-gold/30 text-gold px-3 py-1.5 text-xs font-medium hover:bg-background/90 hover:border-gold/60 transition-all disabled:opacity-60"
      >
        {isUploading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Camera size={14} />
        )}
        <span className="hidden sm:inline">
          {isUploading ? 'Enviando...' : 'Trocar imagem'}
        </span>
      </button>
    </div>
  );
}
