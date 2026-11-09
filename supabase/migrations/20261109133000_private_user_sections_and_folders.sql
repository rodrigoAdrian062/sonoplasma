CREATE OR REPLACE FUNCTION public.set_owner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL
     AND (
       TG_TABLE_NAME IN (
         'sonoplastia_secoes',
         'sonoplastia_etapas',
         'sonoplastia_etapa_audios',
         'sonoplastia_audios_pastas'
       )
       OR NOT public.has_role(auth.uid(), 'super_admin')
     ) THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "view own or shared" ON public.sonoplastia_secoes;
DROP POLICY IF EXISTS "insert own or admin shared" ON public.sonoplastia_secoes;
DROP POLICY IF EXISTS "update own or admin shared" ON public.sonoplastia_secoes;
DROP POLICY IF EXISTS "delete own or admin shared" ON public.sonoplastia_secoes;

CREATE POLICY "view own sections"
  ON public.sonoplastia_secoes FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "insert own sections"
  ON public.sonoplastia_secoes FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update own sections"
  ON public.sonoplastia_secoes FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own sections"
  ON public.sonoplastia_secoes FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "view own or shared" ON public.sonoplastia_etapas;
DROP POLICY IF EXISTS "insert own or admin shared" ON public.sonoplastia_etapas;
DROP POLICY IF EXISTS "update own or admin shared" ON public.sonoplastia_etapas;
DROP POLICY IF EXISTS "delete own or admin shared" ON public.sonoplastia_etapas;

CREATE POLICY "view own stages"
  ON public.sonoplastia_etapas FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "insert own stages"
  ON public.sonoplastia_etapas FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update own stages"
  ON public.sonoplastia_etapas FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own stages"
  ON public.sonoplastia_etapas FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "view own or shared" ON public.sonoplastia_audios_pastas;
DROP POLICY IF EXISTS "insert own or admin shared" ON public.sonoplastia_audios_pastas;
DROP POLICY IF EXISTS "update own or admin shared" ON public.sonoplastia_audios_pastas;
DROP POLICY IF EXISTS "delete own or admin shared" ON public.sonoplastia_audios_pastas;

CREATE POLICY "view own audio folders"
  ON public.sonoplastia_audios_pastas FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "insert own audio folders"
  ON public.sonoplastia_audios_pastas FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update own audio folders"
  ON public.sonoplastia_audios_pastas FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own audio folders"
  ON public.sonoplastia_audios_pastas FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
