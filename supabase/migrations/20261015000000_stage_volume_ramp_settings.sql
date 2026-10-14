ALTER TABLE public.sonoplastia_etapas
  ADD COLUMN IF NOT EXISTS volume_start_percent integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS volume_ramp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS volume_final_percent integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS volume_ramp_seconds integer NOT NULL DEFAULT 3;

ALTER TABLE public.sonoplastia_etapas
  ADD CONSTRAINT sonoplastia_etapas_volume_start_percent_check
    CHECK (volume_start_percent BETWEEN 0 AND 100),
  ADD CONSTRAINT sonoplastia_etapas_volume_final_percent_check
    CHECK (volume_final_percent BETWEEN volume_start_percent AND 100),
  ADD CONSTRAINT sonoplastia_etapas_volume_ramp_seconds_check
    CHECK (volume_ramp_seconds IN (1, 2, 3, 5, 10, 15, 30));
