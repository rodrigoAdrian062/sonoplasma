-- Create a table for app settings
CREATE TABLE public.sonoplastia_configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_app TEXT NOT NULL DEFAULT 'Sonoplastia Cerimonial',
  subtitulo_app TEXT DEFAULT 'Sistema de Ambientação Musical',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sonoplastia_configuracoes ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (anyone can see the settings)
CREATE POLICY "Anyone can view settings" 
ON public.sonoplastia_configuracoes 
FOR SELECT 
USING (true);

-- Create policy for public write access (for now, anyone can update)
CREATE POLICY "Anyone can update settings" 
ON public.sonoplastia_configuracoes 
FOR UPDATE 
USING (true);

-- Create policy for insert (to create initial settings)
CREATE POLICY "Anyone can insert settings" 
ON public.sonoplastia_configuracoes 
FOR INSERT 
WITH CHECK (true);

-- Insert default settings
INSERT INTO public.sonoplastia_configuracoes (nome_app, subtitulo_app) 
VALUES ('Sonoplastia Cerimonial', 'Sistema de Ambientação Musical');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_configuracoes_updated_at
BEFORE UPDATE ON public.sonoplastia_configuracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();