-- Login desativado: acesso direto (dados compartilhados, sem dono obrigatório)
ALTER TABLE public.sonoplastia_estado ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.sonoplastia_roteiros ALTER COLUMN owner_id DROP NOT NULL;

DO $$
DECLARE t text;
DECLARE p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sonoplastia_secoes','sonoplastia_etapas','sonoplastia_etapa_audios',
    'sonoplastia_audios_biblioteca','sonoplastia_audios_pastas',
    'sonoplastia_configuracoes','sonoplastia_estado','sonoplastia_execucoes',
    'sonoplastia_faixas','sonoplastia_roteiros'
  ] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "acesso publico" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
