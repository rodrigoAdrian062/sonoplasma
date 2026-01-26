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
import { Loader2, ImagePlus, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const [nomeApp, setNomeApp] = useState('');
  const [subtituloApp, setSubtituloApp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setNomeApp(settings.nome_app || '');
      setSubtituloApp(settings.subtitulo_app || '');
      setLogoUrl(settings.logo_url || '');
      setPreviewLogo(settings.logo_url || null);
    }
  }, [settings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPreviewLogo(dataUrl);
        setLogoUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setPreviewLogo(null);
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    updateSettings.mutate({
      nome_app: nomeApp.trim() || 'Sonoplastia Cerimonial',
      subtitulo_app: subtituloApp.trim() || null,
      logo_url: logoUrl || null,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
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
                  PNG, JPG ou SVG
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
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="bg-gold hover:bg-gold-glow text-background"
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
