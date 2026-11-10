import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { resizeImage } from '@/lib/imageUtils';
import { mensagemUpload } from '@/lib/errorHandler';
import { getOwnedStorageObjectPath } from '@/lib/storagePaths';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import masonicBanner from '@/assets/masonic-banner.png';

export function EditableBanner() {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
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
    let uploadedUrl: string | null = null;
    let settingsSaveFailed = false;
    try {
      if (!user?.id) throw new Error('É necessário entrar na conta para enviar imagens.');
      const resized = await resizeImage(file, 1600, 600);

      if (resized.size > 3 * 1024 * 1024) {
        toast.error('Imagem muito grande, tente uma menor.');
        return;
      }

      const fileName = `${user.id}/banner-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, resized, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      uploadedUrl = publicUrl;
      try {
        await updateSettings.mutateAsync({ banner_url: publicUrl });
      } catch (error) {
        settingsSaveFailed = true;
        throw error;
      }

      const oldBannerPath = getOwnedStorageObjectPath(settings?.banner_url, 'logos', user.id);
      if (oldBannerPath && settings?.banner_url !== publicUrl) {
        const { error } = await supabase.storage.from('logos').remove([oldBannerPath]);
        if (error) console.warn('Não foi possível remover o banner anterior:', error);
      }
    } catch (error) {
      console.error('Banner upload error:', error);
      const uploadedPath = getOwnedStorageObjectPath(uploadedUrl, 'logos', user?.id);
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from('logos').remove([uploadedPath]);
        if (cleanupError) console.warn('Não foi possível remover o banner não salvo:', cleanupError);
      }
      if (!settingsSaveFailed) toast.error(mensagemUpload(error));
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
