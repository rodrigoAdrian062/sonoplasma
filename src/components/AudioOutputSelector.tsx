import { useEffect, useState } from 'react';
import { Headphones, Loader2, RefreshCw, Volume2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAudioOutputId,
  isSetSinkIdSupported,
  listAudioOutputs,
  setAudioOutputId,
  subscribeAudioOutput,
} from '@/lib/audioOutput';
import { toast } from 'sonner';

export function AudioOutputSelector() {
  const supported = isSetSinkIdSupported();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [current, setCurrent] = useState<string>(() => getAudioOutputId());
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeAudioOutput(setCurrent), []);

  useEffect(() => {
    if (!supported) return;
    // Atualiza automaticamente quando dispositivos são conectados/desconectados
    // (fone Bluetooth pareado, cabo USB, etc.).
    const md = navigator.mediaDevices;
    const onChange = () => { void refresh(false); };
    md.addEventListener?.('devicechange', onChange);
    return () => md.removeEventListener?.('devicechange', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const refresh = async (askPermission = true) => {
    setLoading(true);
    try {
      const list = askPermission
        ? await listAudioOutputs()
        : ((await navigator.mediaDevices.enumerateDevices()) || []).filter(
            (d) => d.kind === 'audiooutput'
          );
      setDevices(list);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível listar os dispositivos de áudio.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (id: string) => {
    try {
      await setAudioOutputId(id);
      const dev = devices.find((d) => d.deviceId === id);
      toast.success(
        id === 'default'
          ? 'Saída automática (padrão do sistema)'
          : `Saída: ${dev?.label || 'Dispositivo selecionado'}`
      );
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível trocar de dispositivo.');
    }
  };

  if (!supported) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Headphones size={16} className="text-gold" />
          Saída de áudio
        </Label>
        <p className="text-xs text-muted-foreground">
          O áudio segue automaticamente o dispositivo padrão do sistema (alto-falantes,
          Bluetooth, fones). Para escolher manualmente aqui dentro do app, use
          Chrome, Edge ou Opera no computador ou Android.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Headphones size={16} className="text-gold" />
        Saída de áudio
      </Label>
      <div className="flex items-center gap-2">
        <Select
          value={current}
          onValueChange={handleChange}
          onOpenChange={(open) => {
            if (open && devices.length === 0) void refresh(true);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Automático (padrão do sistema)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">
              <div className="flex items-center gap-2">
                <Volume2 size={14} className="text-gold" />
                Automático (padrão do sistema)
              </div>
            </SelectItem>
            {devices
              .filter((d) => d.deviceId && d.deviceId !== 'default')
              .map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `Dispositivo ${d.deviceId.slice(0, 6)}`}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void refresh(true)}
          disabled={loading}
          title="Atualizar lista"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Escolha para onde o áudio vai (alto-falante, Bluetooth, fones). "Automático"
        segue o dispositivo padrão do sistema — inclusive ao parear um novo Bluetooth.
      </p>
    </div>
  );
}
