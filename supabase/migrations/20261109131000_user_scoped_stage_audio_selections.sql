CREATE OR REPLACE FUNCTION public.set_owner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL
     AND (
       TG_TABLE_NAME = 'sonoplastia_etapa_audios'
       OR NOT public.has_role(auth.uid(), 'super_admin')
     ) THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "view own or shared" ON public.sonoplastia_etapa_audios;
DROP POLICY IF EXISTS "insert own or admin shared" ON public.sonoplastia_etapa_audios;
DROP POLICY IF EXISTS "update own or admin shared" ON public.sonoplastia_etapa_audios;
DROP POLICY IF EXISTS "delete own or admin shared" ON public.sonoplastia_etapa_audios;

CREATE POLICY "view own stage audio selections"
  ON public.sonoplastia_etapa_audios FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "insert own stage audio selections"
  ON public.sonoplastia_etapa_audios FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update own stage audio selections"
  ON public.sonoplastia_etapa_audios FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own stage audio selections"
  ON public.sonoplastia_etapa_audios FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
