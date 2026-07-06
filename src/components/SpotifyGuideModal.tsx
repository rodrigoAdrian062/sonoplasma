import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/useSettings';
import { Loader2, ExternalLink, Eye, EyeOff, CheckCircle2, Music } from 'lucide-react';
import { toast } from 'sonner';

interface SpotifyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: 'Acesse o Spotify Developer',
    desc: 'Entre no Painel de Desenvolvedores do Spotify e faça login com sua conta.',
    link: 'https://developer.spotify.com/dashboard',
    linkLabel: 'Abrir Spotify Developer Dashboard',
  },
  {
    title: 'Crie um App',
    desc: 'Clique em "Create app". Dê um nome (ex: "Sonoplastia Cerimonial") e uma descrição. Em "Redirect URI" pode colocar http://localhost e marque "Web API".',
  },
  {
    title: 'Copie o Client ID',
    desc: 'Dentro do app criado, abra "Settings". O "Client ID" aparece na tela — copie e cole no campo abaixo.',
  },
  {
    title: 'Copie o Client Secret',
    desc: 'Ainda em "Settings", clique em "View client secret". Copie o valor e cole no campo abaixo.',
  },
];

export function SpotifyGuideModal({ isOpen, onClose }: SpotifyGuideModalProps) {
  const { settings, updateSettings } = useSettings();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (settings) {
      setClientId(settings.spotify_client_id || '');
      setClientSecret(settings.spotify_client_secret || '');
    }
  }, [settings, isOpen]);

  const isConfigured = !!settings?.spotify_client_id && !!settings?.spotify_client_secret;

  const handleSave = () => {
    updateSettings.mutate(
      {
        spotify_client_id: clientId.trim() || null,
        spotify_client_secret: clientSecret.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Chaves do Spotify salvas!');
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg w-[calc(100%-1rem)] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            <Music className="text-gold" size={22} />
            Conectar Spotify
          </DialogTitle>
          <DialogDescription>
            Siga o guia para obter suas chaves e cole-as nos campos abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {isConfigured && (
            <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              <CheckCircle2 size={16} />
              <span>Chaves do Spotify já configuradas.</span>
            </div>
          )}

          {/* Guia */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Como encontrar as chaves
            </h3>
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
                      >
                        {step.linkLabel} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Campos manuais */}
          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">
              Adicionar chaves manualmente
            </h3>
            <div className="space-y-2">
              <Label htmlFor="spotify-client-id">Client ID</Label>
              <Input
                id="spotify-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Cole aqui o Client ID"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spotify-client-secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="spotify-client-secret"
                  type={showSecret ? 'text' : 'password'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Cole aqui o Client Secret"
                  autoComplete="off"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showSecret ? 'Ocultar' : 'Mostrar'}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
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
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar chaves'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
