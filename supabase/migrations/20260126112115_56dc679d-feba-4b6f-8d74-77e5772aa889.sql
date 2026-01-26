-- Create table for stage audios (up to 5 per stage)
CREATE TABLE public.sonoplastia_etapa_audios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES public.sonoplastia_etapas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT max_5_audios_per_stage CHECK (ordem >= 0 AND ordem < 5)
);

-- Enable RLS
ALTER TABLE public.sonoplastia_etapa_audios ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Acesso público para leitura de áudios" 
ON public.sonoplastia_etapa_audios 
FOR SELECT 
USING (true);

CREATE POLICY "Acesso público para inserir áudios" 
ON public.sonoplastia_etapa_audios 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Acesso público para atualizar áudios" 
ON public.sonoplastia_etapa_audios 
FOR UPDATE 
USING (true);

CREATE POLICY "Acesso público para deletar áudios" 
ON public.sonoplastia_etapa_audios 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_etapa_audios_updated_at
BEFORE UPDATE ON public.sonoplastia_etapa_audios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_etapa_audios_etapa_id ON public.sonoplastia_etapa_audios(etapa_id);