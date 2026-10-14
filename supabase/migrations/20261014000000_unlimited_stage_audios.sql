ALTER TABLE public.sonoplastia_etapa_audios
  DROP CONSTRAINT IF EXISTS max_5_audios_per_stage;

ALTER TABLE public.sonoplastia_etapa_audios
  DROP CONSTRAINT IF EXISTS max_10_audios_per_stage;

ALTER TABLE public.sonoplastia_etapa_audios
  ADD CONSTRAINT etapa_audios_ordem_nonnegative CHECK (ordem >= 0);
