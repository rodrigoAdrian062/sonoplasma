import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Youtube, Search, Plus, ExternalLink, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';

interface Suggestion {
  nome: string;
  artista?: string;
  motivo?: string;
  categoria?: string;
  duracao?: string;
  bpm?: number;
  solenidade?: number;
  youtube_url?: string;
  youtube_search_url: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stageTitle: string;
  stageDescription?: string;
  onAddToStage?: (item: { nome: string; audio_url: string }) => void;
}

export function YoutubeAiSuggestionsModal({ isOpen, onClose, stageTitle, stageDescription, onAddToStage }: Props) {
  const { addAudio } = useAudioLibrary();
  const [hint, setHint] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [added, setAdded] = useState<Record<string, 'library' | 'stage'>>({});

  const run = async () => {
    setLoading(true);
    setSuggestions([]);
    setAdded({});
    try {
      const { data, error } = await supabase.functions.invoke('suggest-youtube-tracks', {
        body: {
          stageTitle,
          stageDescription: stageDescription || '',
          userHint: hint,
          sessionType,
          limit: 10,
        },
      });
      if (error) {
        toast.error('Falha ao consultar IA', { description: error.message });
        return;
      }
      const list: Suggestion[] = Array.isArray(data?.suggestions) ? data.suggestions : [];
      if (list.length === 0) {
        toast.info('A IA não retornou sugestões — tente refinar a prévia.');
      }
      setSuggestions(list);
    } catch (e: any) {
      toast.error('Erro inesperado', { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const addToLibrary = async (s: Suggestion) => {
    const url = s.youtube_url;
    if (!url) {
      toast.info('Sem link direto — abra a busca e cole o link real na biblioteca.');
      return;
    }
    try {
      await addAudio.mutateAsync({
        nome: `${s.nome}${s.artista ? ' — ' + s.artista : ''}`,
        audio_url: url,
        tipo: 'youtube',
      });
      setAdded((p) => ({ ...p, [s.nome]: 'library' }));
    } catch { /* toast handled inside hook */ }
  };

  const addToStage = (s: Suggestion) => {
    if (!onAddToStage) return;
    if (!s.youtube_url) {
      toast.info('Sem link direto — abra a busca no YouTube para pegar o link.');
      return;
    }
    onAddToStage({
      nome: `${s.nome}${s.artista ? ' — ' + s.artista : ''}`,
      audio_url: s.youtube_url,
    });
    setAdded((p) => ({ ...p, [s.nome]: 'stage' }));
    toast.success('Adicionado à etapa');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            Sugerir do YouTube — Mestre de Harmonia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            Etapa: <span className="text-foreground font-medium">{stageTitle}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Tipo de sessão (opcional)</label>
              <input
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                placeholder="Ex: Iniciação, Elevação, Magna, Homenagem…"
                className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Prévia / instruções (opcional)</label>
              <Textarea
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Descreva o clima do momento…"
                className="mt-1 min-h-[42px]"
                rows={2}
              />
            </div>
          </div>

          <Button onClick={run} disabled={loading} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {suggestions.length > 0 ? 'Gerar novamente' : 'Buscar sugestões'}
          </Button>
        </div>

        <ScrollArea className="flex-1 mt-3 pr-3 -mr-3">
          <div className="space-y-2">
            {suggestions.map((s, i) => {
              const state = added[s.nome];
              return (
                <div key={i} className="border border-border rounded-lg p-3 bg-card/60 hover:bg-card transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{s.nome}</span>
                        {s.artista && <span className="text-xs text-muted-foreground">— {s.artista}</span>}
                      </div>
                      {s.motivo && <p className="text-xs text-muted-foreground mt-1">{s.motivo}</p>}
                      <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px] text-muted-foreground">
                        {s.categoria && <span className="px-2 py-0.5 rounded-full bg-gold/10 text-gold">{s.categoria}</span>}
                        {s.duracao && <span>⏱ {s.duracao}</span>}
                        {s.bpm && <span>♩ {s.bpm} BPM</span>}
                        {s.solenidade && <span>{'★'.repeat(s.solenidade)}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {s.youtube_url ? (
                        <a href={s.youtube_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="w-full">
                            <Youtube className="w-3.5 h-3.5 mr-1 text-red-500" />
                            Abrir
                          </Button>
                        </a>
                      ) : (
                        <a href={s.youtube_search_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="w-full">
                            <Search className="w-3.5 h-3.5 mr-1" />
                            Buscar
                          </Button>
                        </a>
                      )}
                      {onAddToStage && (
                        <Button size="sm" variant="ghost" disabled={state === 'stage' || !s.youtube_url} onClick={() => addToStage(s)}>
                          {state === 'stage' ? <Check className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                          Na etapa
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={state === 'library' || !s.youtube_url} onClick={() => addToLibrary(s)}>
                        {state === 'library' ? <Check className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                        Biblioteca
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {suggestions.length === 0 && !loading && (
              <div className="text-center text-sm text-muted-foreground py-10">
                Descreva o tipo de sessão / clima e clique em <b>Buscar sugestões</b>.
                <br />
                A IA vai sugerir obras instrumentais reais do YouTube.
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/50">
          Nomes gerados por IA. Quando não houver link direto, clique em <b>Buscar</b> para localizar no YouTube e cole o link real na biblioteca.
        </div>
      </DialogContent>
    </Dialog>
  );
}
