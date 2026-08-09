ALTER TABLE public.sonoplastia_etapas ADD COLUMN IF NOT EXISTS fundo_musicas jsonb DEFAULT '[]'::jsonb;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sonoplastia_etapas TO authenticated;
GRANT ALL ON public.sonoplastia_etapas TO service_role;