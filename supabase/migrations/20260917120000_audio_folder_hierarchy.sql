ALTER TABLE public.sonoplastia_audios_pastas
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.sonoplastia_audios_pastas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sonoplastia_audios_pastas_parent_id_idx
  ON public.sonoplastia_audios_pastas(parent_id);