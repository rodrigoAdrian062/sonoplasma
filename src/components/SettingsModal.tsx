import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { ColorPicker } from '@/components/ColorPicker';
import { resizeImage, formatFileSize } from '@/lib/imageUtils';
import { Loader2, ImagePlus, X, Upload, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { BackupSection } from '@/components/BackupSection';
import { AudioOutputSelector } from '@/components/AudioOutputSelector';
import { Switch } from '@/components/ui/switch';
import { usePrefetchEnabled } from '@/hooks/usePrefetchEnabled';
import { useUiToggles } from '@/hooks/useUiToggles';
import { useFrequency432, useHealingHz } from '@/hooks/useFrequency432';
import { HEALING_FREQUENCIES } from '@/lib/pitch432';
import { Download, Eye, Music2 } from 'lucide-react';
import { mensagemUpload } from '@/lib/errorHandler';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const { isSuperAdmin } = useUserRole();
  const navigate = useNavigate();
  const [prefetchOn, setPrefetchOn] = usePrefetchEnabled();
  const [, setFreq432] = useFrequency432();
  const [healingHz, setHealingHz] = useHealingHz();
  const { toggles, setToggle } = useUiToggles();
  const [nomeApp, setNomeApp] = useState('');
  const [subtituloApp, setSubtituloApp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [corTema, setCorTema] = useState('#D4AF37');
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [resizedSize, setResizedSize] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const testCtxRef = useRef<AudioContext | null>(null);

  const testTone = (mode: 'ref' | 'selected' | 'ab') => {
    try {
      if (!testCtxRef.current) {
        testCtxRef.current = new AudioContext();
      }
      const ctx = testCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const play = (freq: number, start: number, dur = 1.4) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.05);
        gain.gain.setValueAtTime(0.18, start + dur - 0.15);
        gain.gain.linearRampToValueAtTime(0, start + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.02);
      };
      const target = healingHz && healingHz !== 440 ? healingHz : 432;
      if (mode === 'ref') play(440, now);
      else if (mode === 'selected') play(target, now);
      else { play(440, now, 1.2); play(target, now + 1.4, 1.2); }
    } catch (err) {
      console.warn('[Hz test] falha ao reproduzir tom de teste:', err);
      toast.error('Não foi possível reproduzir o tom de teste.');
    }
  };


  useEffect(() => {
    if (settings) {
      setNomeApp(settings.nome_app || '');
      setSubtituloApp(settings.subtitulo_app || '');
      setLogoUrl(settings.logo_url || '');
      setCorTema(settings.cor_tema || '#D4AF37');
      setPreviewLogo(settings.logo_url || null);
    }
  }, [settings]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem.');
      return;
    }

    setOriginalSize(file.size);
    setIsResizing(true);

    try {
      // Resize image if needed
      const resizedFile = await resizeImage(file);
      setResizedSize(resizedFile.size);

      // Check final size (max 2MB)
      if (resizedFile.size > 2 * 1024 * 1024) {
        toast.error('Imagem ainda muito grande após redimensionamento.');
        setIsResizing(false);
        return;
      }

      setSelectedFile(resizedFile);

      // Show resize info if file was resized
      if (resizedFile.size < file.size) {
        toast.success(
          `Imagem redimensionada: ${formatFileSize(file.size)} → ${formatFileSize(resizedFile.size)}`
        );
      }

      // Create local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewLogo(reader.result as string);
      };
      reader.readAsDataURL(resizedFile);
    } catch (error) {
      console.error('Resize error:', error);
      toast.error('Erro ao processar imagem');
    } finally {
      setIsResizing(false);
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
    setOriginalSize(null);
    setResizedSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      // Generate unique filename inside the user's folder
      const fileExt = file.name.split('.').pop();
      const fileName = `publico/logo-${Date.now()}.${fileExt}`;

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
      toast.error(mensagemUpload(error));
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
      setOriginalSize(null);
      setResizedSize(null);
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
    setOriginalSize(null);
    setResizedSize(null);
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
      <DialogContent className="sm:max-w-md w-[calc(100%-1rem)] sm:w-full max-h-[90vh] overflow-y-auto">
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
                  onClick={() => !isResizing && fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-gold/50 flex items-center justify-center cursor-pointer transition-colors"
                >
                  {isResizing ? (
                    <Loader2 className="text-muted-foreground animate-spin" size={24} />
                  ) : (
                    <ImagePlus className="text-muted-foreground" size={24} />
                  )}
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
                  disabled={isResizing}
                >
                  {isResizing ? 'Processando...' : 'Escolher imagem'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou SVG (redimensiona automaticamente)
                </p>
                {selectedFile && originalSize && resizedSize && resizedSize < originalSize && (
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircle2 size={12} />
                    <span>
                      Reduzido de {formatFileSize(originalSize)} para {formatFileSize(resizedSize)}
                    </span>
                  </div>
                )}
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

          {/* Saída de áudio */}
          <AudioOutputSelector />

          {/* Pré-carregamento das próximas etapas */}
          <div className="space-y-2 border-t border-border pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Label className="flex items-center gap-2">
                  <Download size={14} className="text-gold" />
                  Pré-carregar próximas etapas
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Baixa os áudios das próximas etapas em segundo plano para iniciar sem atraso.
                </p>
              </div>
              <Switch checked={prefetchOn} onCheckedChange={setPrefetchOn} />
            </div>
          </div>

          {/* Frequência curativa */}
          <div className="space-y-3 border-t border-border pt-5">
            <div>
              <Label className="flex items-center gap-2">
                <Music2 size={14} className="text-gold" />
                Frequência curativa dos áudios
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Reafina os áudios em tempo real, preservando a velocidade original. Aplica-se aos arquivos locais das etapas e à música de fundo. YouTube não é suportado.
              </p>
            </div>

            <div className="grid gap-2">
              {HEALING_FREQUENCIES.map((f) => {
                const active = healingHz === f.hz;
                return (
                  <button
                    key={f.hz}
                    type="button"
                    onClick={() => {
                      setHealingHz(f.hz);
                      // manter flag legada em sincronia
                      setFreq432(f.hz !== 440);
                    }}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      active
                        ? 'border-gold bg-gold/10 shadow-[0_0_10px_hsl(var(--gold)/0.2)]'
                        : 'border-border hover:border-gold/40 hover:bg-gold/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${active ? 'text-gold' : ''}`}>
                        {f.label}
                      </span>
                      {active && (
                        <span className="text-[10px] uppercase tracking-wider text-gold">
                          Ativa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {f.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => testTone('ref')}
                className="h-8"
              >
                Testar 440 Hz
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => testTone('selected')}
                className="h-8 border-gold/50 text-gold hover:bg-gold/10"
                disabled={healingHz === 440}
              >
                Testar {healingHz !== 440 ? `${healingHz} Hz` : 'selecionada'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => testTone('ab')}
                className="h-8"
                disabled={healingHz === 440}
              >
                A/B (440 → selecionada)
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Tom de teste (Lá) — compare de ouvido antes de usar no templo.
              </span>
            </div>
          </div>



          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-gold" />
              <Label className="m-0">Botões e atalhos visíveis</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Desative o que não quer usar. Fica oculto até ativar novamente aqui.
            </p>

            {([
              { key: 'btn_apresentar', label: 'Botão "Apresentar" (modo apresentação)' },
              { key: 'nav_biblioteca', label: 'Atalho rápido: Biblioteca' },
              { key: 'nav_youtube', label: 'Atalho rápido: YouTube' },
              { key: 'nav_spotify', label: 'Atalho rápido: Spotify' },

              
            ] as const).map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <span className="text-sm">{item.label}</span>
                <Switch
                  checked={toggles[item.key]}
                  onCheckedChange={(v) => setToggle(item.key, v)}
                />
              </div>
            ))}
          </div>

          {/* Backup / Restauração */}
          <BackupSection />




          {/* Gerenciar acessos (apenas Plenitude) */}
          {isSuperAdmin && (
            <div className="space-y-2 border-t border-border pt-5">
              <Label>Acessos</Label>
              <p className="text-xs text-muted-foreground">
                Crie, edite ou exclua usuários e senhas para outras pessoas.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => { handleClose(); navigate('/usuarios'); }}
              >
                <Users size={16} className="mr-2 text-gold" />
                Gerenciar acessos
              </Button>
            </div>
          )}
        </div>


        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending || isUploading || isResizing}
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
