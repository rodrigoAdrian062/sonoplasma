-- Tabela de etapas cerimoniais
CREATE TABLE public.sonoplastia_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_simbolico VARCHAR(100) NOT NULL,
  descricao TEXT,
  audio_url TEXT,
  tempo_padrao INTEGER DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  icone VARCHAR(50) DEFAULT 'flame',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de histórico de execuções
CREATE TABLE public.sonoplastia_execucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID REFERENCES public.sonoplastia_etapas(id) ON DELETE CASCADE,
  inicio TIMESTAMP WITH TIME ZONE,
  fim TIMESTAMP WITH TIME ZONE,
  tempo_executado INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'idle',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS (acesso público para este sistema sem login)
ALTER TABLE public.sonoplastia_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sonoplastia_execucoes ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (sistema sem autenticação conforme requisito)
CREATE POLICY "Acesso público para leitura de etapas" 
ON public.sonoplastia_etapas 
FOR SELECT 
USING (true);

CREATE POLICY "Acesso público para inserir etapas" 
ON public.sonoplastia_etapas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Acesso público para atualizar etapas" 
ON public.sonoplastia_etapas 
FOR UPDATE 
USING (true);

CREATE POLICY "Acesso público para deletar etapas" 
ON public.sonoplastia_etapas 
FOR DELETE 
USING (true);

CREATE POLICY "Acesso público para leitura de execuções" 
ON public.sonoplastia_execucoes 
FOR SELECT 
USING (true);

CREATE POLICY "Acesso público para inserir execuções" 
ON public.sonoplastia_execucoes 
FOR INSERT 
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sonoplastia_etapas_updated_at
BEFORE UPDATE ON public.sonoplastia_etapas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir etapas padrão
INSERT INTO public.sonoplastia_etapas (nome_simbolico, descricao, audio_url, tempo_padrao, ordem, icone) VALUES
  ('Acendimento das Luzes', 'Momento inicial de iluminação e preparação do ambiente sagrado', '', 180, 1, 'flame'),
  ('Marcha ao Oriente', 'Procissão cerimonial em direção ao altar', '', 120, 2, 'compass'),
  ('Silêncio Interior', 'Momento de meditação e introspecção silenciosa', '', 300, 3, 'eye'),
  ('Coluna em Harmonia', 'Acompanhamento musical durante os trabalhos rituais', '', 0, 4, 'columns'),
  ('Fechamento dos Trabalhos', 'Conclusão solene das atividades cerimoniais', '', 180, 5, 'book-open'),
  ('Véu do Silêncio', 'Música ambiente contínua para momentos de transição', '', 0, 6, 'wind');
