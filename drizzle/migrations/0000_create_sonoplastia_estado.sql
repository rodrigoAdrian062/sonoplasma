CREATE TABLE public.sonoplastia_estado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  chave text NOT NULL,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, chave)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sonoplastia_estado TO authenticated;
GRANT ALL ON public.sonoplastia_estado TO service_role;

ALTER TABLE public.sonoplastia_estado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estado select own" ON public.sonoplastia_estado FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "estado insert own" ON public.sonoplastia_estado FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "estado update own" ON public.sonoplastia_estado FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "estado delete own" ON public.sonoplastia_estado FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TRIGGER update_sonoplastia_estado_updated_at
BEFORE UPDATE ON public.sonoplastia_estado
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();