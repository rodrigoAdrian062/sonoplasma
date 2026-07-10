-- Config columns for commemorative banner mode
ALTER TABLE public.sonoplastia_configuracoes
  ADD COLUMN IF NOT EXISTS faixa_modo text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS faixa_manual_key text;

-- Per-owner overrides for commemorative date banners
CREATE TABLE IF NOT EXISTS public.sonoplastia_faixas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid,
  faixa_key text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  texto text,
  cor_fundo text,
  cor_texto text,
  icone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_id, faixa_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sonoplastia_faixas TO authenticated;
GRANT ALL ON public.sonoplastia_faixas TO service_role;

ALTER TABLE public.sonoplastia_faixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own faixas"
  ON public.sonoplastia_faixas FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER set_faixas_owner_id
  BEFORE INSERT ON public.sonoplastia_faixas
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

CREATE TRIGGER update_faixas_updated_at
  BEFORE UPDATE ON public.sonoplastia_faixas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();