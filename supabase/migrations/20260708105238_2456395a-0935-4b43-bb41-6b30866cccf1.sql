-- Trigger: sempre vincular ao usuário atual (inclusive super_admin)
CREATE OR REPLACE FUNCTION public.set_owner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sonoplastia_secoes','sonoplastia_etapas','sonoplastia_etapa_audios',
    'sonoplastia_audios_biblioteca','sonoplastia_audios_pastas',
    'sonoplastia_configuracoes','sonoplastia_execucoes'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "view own or shared" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "insert own or admin shared" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "update own or admin shared" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "delete own or admin shared" ON public.%I;', t);

    EXECUTE format('CREATE POLICY "view own" ON public.%I FOR SELECT TO authenticated USING (owner_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY "insert own" ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);', t);
    EXECUTE format('CREATE POLICY "update own" ON public.%I FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY "delete own" ON public.%I FOR DELETE TO authenticated USING (owner_id = auth.uid());', t);
  END LOOP;
END $$;