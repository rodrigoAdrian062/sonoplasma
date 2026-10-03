CREATE TABLE public.user_openai_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_key text NOT NULL,
  initialization_vector text NOT NULL,
  key_suffix text NOT NULL CHECK (length(key_suffix) = 4),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_openai_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_openai_connections FROM anon, authenticated;
GRANT ALL ON public.user_openai_connections TO service_role;
