ALTER TABLE public.sonoplastia_etapas 
ADD COLUMN IF NOT EXISTS oculto boolean DEFAULT false;

-- Re-grant permissions just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sonoplastia_etapas TO authenticated;
GRANT ALL ON public.sonoplastia_etapas TO service_role;
