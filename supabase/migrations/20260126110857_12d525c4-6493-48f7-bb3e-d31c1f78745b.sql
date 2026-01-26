-- Add theme color column to settings
ALTER TABLE public.sonoplastia_configuracoes
ADD COLUMN cor_tema TEXT DEFAULT '#D4AF37';