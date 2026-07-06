ALTER TABLE public.sonoplastia_configuracoes
  ADD COLUMN IF NOT EXISTS spotify_client_id text,
  ADD COLUMN IF NOT EXISTS spotify_client_secret text;