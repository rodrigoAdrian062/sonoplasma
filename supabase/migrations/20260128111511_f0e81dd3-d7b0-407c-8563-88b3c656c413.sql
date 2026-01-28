-- Create audio library table
CREATE TABLE public.sonoplastia_audios_biblioteca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  tamanho_bytes INTEGER,
  tipo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sonoplastia_audios_biblioteca ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Acesso público para leitura de áudios da biblioteca"
ON public.sonoplastia_audios_biblioteca
FOR SELECT
USING (true);

CREATE POLICY "Acesso público para inserir áudios na biblioteca"
ON public.sonoplastia_audios_biblioteca
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Acesso público para atualizar áudios da biblioteca"
ON public.sonoplastia_audios_biblioteca
FOR UPDATE
USING (true);

CREATE POLICY "Acesso público para deletar áudios da biblioteca"
ON public.sonoplastia_audios_biblioteca
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_sonoplastia_audios_biblioteca_updated_at
BEFORE UPDATE ON public.sonoplastia_audios_biblioteca
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();