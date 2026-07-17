
CREATE TABLE public.sonoplastia_roteiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  secao_id uuid REFERENCES public.sonoplastia_secoes(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Novo Roteiro',
  conteudo text NOT NULL DEFAULT '',
  is_template boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX sonoplastia_roteiros_secao_owner_uniq
  ON public.sonoplastia_roteiros (secao_id, owner_id)
  WHERE secao_id IS NOT NULL;

CREATE INDEX sonoplastia_roteiros_owner_idx ON public.sonoplastia_roteiros (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sonoplastia_roteiros TO authenticated;
GRANT ALL ON public.sonoplastia_roteiros TO service_role;

ALTER TABLE public.sonoplastia_roteiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roteiros_select_own" ON public.sonoplastia_roteiros
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "roteiros_insert_own" ON public.sonoplastia_roteiros
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "roteiros_update_own" ON public.sonoplastia_roteiros
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "roteiros_delete_own" ON public.sonoplastia_roteiros
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TRIGGER trg_roteiros_updated_at
  BEFORE UPDATE ON public.sonoplastia_roteiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
