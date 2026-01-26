import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { ColorPicker } from '@/components/ColorPicker';
import { Loader2, ImagePlus, X, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const [nomeApp, setNomeApp] = useState('');
  const [subtituloApp, setSubtituloApp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [corTema, setCorTema] = useState('#D4AF37');
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setNomeApp(settings.nome_app || '');
      setSubtituloApp(settings.subtitulo_app || '');
      setLogoUrl(settings.logo_url || '');
      setCorTema(settings.cor_tema || '#D4AF37');
      setPreviewLogo(settings.logo_url || null);
    }
  }, [settings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 2MB.');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem.');
        return;
      }

      setSelectedFile(file);
      
      // Create local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async () => {
    // If there's an existing logo URL, try to delete it from storage
    if (logoUrl && logoUrl.includes('logos/')) {
      try {
        const path = logoUrl.split('logos/')[1];
        if (path) {
          await supabase.storage.from('logos').remove([path]);
        }
      } catch (error) {
        console.error('Error deleting old logo:', error);
      }
    }

    setPreviewLogo(null);
    setLogoUrl('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (logoUrl && logoUrl.includes('logos/')) {
        const oldPath = logoUrl.split('logos/')[1];
        if (oldPath) {
          await supabase.storage.from('logos').remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da imagem');
      return null;
    }
  };

  const handleSave = async () => {
    setIsUploading(true);

    try {
      let finalLogoUrl = logoUrl;

      // Upload new logo if a file was selected
      if (selectedFile) {
        const uploadedUrl = await uploadLogo(selectedFile);
        if (uploadedUrl) {
          finalLogoUrl = uploadedUrl;
        } else {
          setIsUploading(false);
          return;
        }
      }

      updateSettings.mutate({
        nome_app: nomeApp.trim() || 'Sonoplastia Cerimonial',
        subtitulo_app: subtituloApp.trim() || null,
        logo_url: finalLogoUrl || null,
        cor_tema: corTema,
      });

      setSelectedFile(null);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Reset selected file on close
    setSelectedFile(null);
    if (settings?.logo_url) {
      setPreviewLogo(settings.logo_url);
    }
    if (settings?.cor_tema) {
      setCorTema(settings.cor_tema);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            Configurações do App
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo do App</Label>
            <div className="flex items-center gap-4">
              {previewLogo ? (
                <div className="relative">
                  <img
                    src={previewLogo}
                    alt="Logo preview"
                    className="w-16 h-16 object-contain rounded-lg border border-border bg-background"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                  >
                    <X size={12} />
                  </button>
                  {selectedFile && (
                    <div className="absolute -bottom-1 -right-1 p-1 bg-gold text-background rounded-full">
                      <Upload size={10} />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-gold/50 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ImagePlus className="text-muted-foreground" size={24} />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex-1 space-y-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Escolher imagem
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou SVG (máx. 2MB)
                </p>
              </div>
            </div>
          </div>

          {/* Nome do App */}
          <div className="space-y-2">
            <Label htmlFor="nome-app">Nome do App</Label>
            <Input
              id="nome-app"
              value={nomeApp}
              onChange={(e) => setNomeApp(e.target.value)}
              placeholder="Ex: Sonoplastia Cerimonial"
              maxLength={50}
            />
          </div>

          {/* Subtítulo */}
          <div className="space-y-2">
            <Label htmlFor="subtitulo-app">Subtítulo (opcional)</Label>
            <Input
              id="subtitulo-app"
              value={subtituloApp}
              onChange={(e) => setSubtituloApp(e.target.value)}
              placeholder="Ex: Sistema de Ambientação Musical"
              maxLength={100}
            />
          </div>

          {/* Cor Tema */}
          <div className="space-y-2">
            <Label>Cor do Tema</Label>
            <ColorPicker value={corTema} onChange={setCorTema} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending || isUploading}
            className="bg-gold hover:bg-gold-glow text-background"
          >
            {(updateSettings.isPending || isUploading) ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isUploading ? 'Enviando...' : 'Salvando...'}
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
