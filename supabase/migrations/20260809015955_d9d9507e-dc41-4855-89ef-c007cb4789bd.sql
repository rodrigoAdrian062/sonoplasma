ALTER TABLE public.sonoplastia_etapas ADD COLUMN IF NOT EXISTS volume_config float4 DEFAULT 0.7; 
ALTER TABLE public.sonoplastia_etapa_audios ADD COLUMN IF NOT EXISTS volume_config float4;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sonoplastia_etapas TO authenticated;
GRANT ALL ON public.sonoplastia_etapas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sonoplastia_etapa_audios TO authenticated;
GRANT ALL ON public.sonoplastia_etapa_audios TO service_role;