import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { FAIXAS_DEFAULT, activeFaixaKey, FaixaDef } from '@/data/commemorativeDates';
import { toast } from 'sonner';

export interface FaixaOverride {
  id?: string;
  faixa_key: string;
  ativo: boolean;
  texto: string | null;
  cor_fundo: string | null;
  cor_texto: string | null;
  icone: string | null;
}

export interface FaixaResolved {
  def: FaixaDef;
  override: FaixaOverride | null;
  ativo: boolean;
  texto: string;
  corFundo: string;
  corTexto: string;
  icone: string;
}

function merge(def: FaixaDef, ov: FaixaOverride | null): FaixaResolved {
  return {
    def,
    override: ov,
    ativo: ov ? ov.ativo : true,
    texto: ov?.texto ?? def.texto,
    corFundo: ov?.cor_fundo ?? def.corFundo,
    corTexto: ov?.cor_texto ?? def.corTexto,
    icone: ov?.icone ?? def.icone,
  };
}

export function useFaixas() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ['faixas', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('sonoplastia_faixas').select('*');
      if (error) throw error;
      return (data || []) as FaixaOverride[];
    },
    enabled: !!user,
  });

  const resolved: FaixaResolved[] = FAIXAS_DEFAULT.map((def) =>
    merge(def, overrides.find((o) => o.faixa_key === def.key) ?? null)
  );

  const saveFaixa = useMutation({
    mutationFn: async (payload: FaixaOverride) => {
      const existing = overrides.find((o) => o.faixa_key === payload.faixa_key);
      if (existing?.id) {
        const { error } = await supabase
          .from('sonoplastia_faixas')
          .update({
            ativo: payload.ativo,
            texto: payload.texto,
            cor_fundo: payload.cor_fundo,
            cor_texto: payload.cor_texto,
            icone: payload.icone,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sonoplastia_faixas').insert({
          faixa_key: payload.faixa_key,
          ativo: payload.ativo,
          texto: payload.texto,
          cor_fundo: payload.cor_fundo,
          cor_texto: payload.cor_texto,
          icone: payload.icone,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faixas'] });
      toast.success('Faixa salva!');
    },
    onError: (e) => {
      console.error(e);
      toast.error('Erro ao salvar faixa');
    },
  });

  const modo = (settings as any)?.faixa_modo ?? 'auto';
  const manualKey = (settings as any)?.faixa_manual_key ?? null;

  // Faixa que deve ser exibida agora
  let currentKey: string | null = null;
  if (modo === 'auto') currentKey = activeFaixaKey();
  else if (modo === 'manual') currentKey = manualKey;

  let current: FaixaResolved | null = null;
  if (currentKey) {
    const found = resolved.find((r) => r.def.key === currentKey);
    if (found && found.ativo) current = found;
  }

  const setModo = (m: string) => updateSettings.mutate({ faixa_modo: m } as any);
  const setManualKey = (k: string | null) =>
    updateSettings.mutate({ faixa_manual_key: k } as any);

  return { resolved, current, modo, manualKey, isLoading, saveFaixa, setModo, setManualKey };
}
