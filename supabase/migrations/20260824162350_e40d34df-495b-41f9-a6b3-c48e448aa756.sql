ALTER TABLE public.sonoplastia_audios_biblioteca
ADD COLUMN IF NOT EXISTS clima TEXT;

ALTER TABLE public.sonoplastia_audios_biblioteca
ADD CONSTRAINT sonoplastia_audios_clima_check
CHECK (clima IS NULL OR clima IN ('solene','reflexiva','emocional','fraternal','transicao'));

CREATE INDEX IF NOT EXISTS idx_sonoplastia_audios_clima ON public.sonoplastia_audios_biblioteca (clima);