
-- Create folders table for audio library
CREATE TABLE public.sonoplastia_audios_pastas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  icone TEXT DEFAULT 'folder',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sonoplastia_audios_pastas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para leitura de pastas" ON public.sonoplastia_audios_pastas FOR SELECT USING (true);
CREATE POLICY "Acesso público para inserir pastas" ON public.sonoplastia_audios_pastas FOR INSERT WITH CHECK (true);
CREATE POLICY "Acesso público para atualizar pastas" ON public.sonoplastia_audios_pastas FOR UPDATE USING (true);
CREATE POLICY "Acesso público para deletar pastas" ON public.sonoplastia_audios_pastas FOR DELETE USING (true);

-- Add folder reference to audios table
ALTER TABLE public.sonoplastia_audios_biblioteca ADD COLUMN pasta_id UUID REFERENCES public.sonoplastia_audios_pastas(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_sonoplastia_audios_pastas_updated_at
BEFORE UPDATE ON public.sonoplastia_audios_pastas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
