-- Create sections table
CREATE TABLE public.sonoplastia_secoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'folder',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add section reference to stages
ALTER TABLE public.sonoplastia_etapas 
ADD COLUMN secao_id UUID REFERENCES public.sonoplastia_secoes(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.sonoplastia_secoes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sections
CREATE POLICY "Acesso público para leitura de seções" 
ON public.sonoplastia_secoes 
FOR SELECT 
USING (true);

CREATE POLICY "Acesso público para inserir seções" 
ON public.sonoplastia_secoes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Acesso público para atualizar seções" 
ON public.sonoplastia_secoes 
FOR UPDATE 
USING (true);

CREATE POLICY "Acesso público para deletar seções" 
ON public.sonoplastia_secoes 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_sonoplastia_secoes_updated_at
BEFORE UPDATE ON public.sonoplastia_secoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_sonoplastia_etapas_secao_id ON public.sonoplastia_etapas(secao_id);