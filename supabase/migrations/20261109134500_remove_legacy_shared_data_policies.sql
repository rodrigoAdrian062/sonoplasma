DO $$
DECLARE
  target_table text;
  existing_policy record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'sonoplastia_secoes',
    'sonoplastia_etapas',
    'sonoplastia_etapa_audios',
    'sonoplastia_audios_pastas',
    'sonoplastia_audios_biblioteca'
  ]
  LOOP
    FOR existing_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
    LOOP
      EXECUTE format(
        'DROP POLICY %I ON public.%I',
        existing_policy.policyname,
        target_table
      );
    END LOOP;
  END LOOP;
END;
$$;

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

CREATE POLICY "view own audio folders"
  ON public.sonoplastia_audios_pastas FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "insert own audio folders"
  ON public.sonoplastia_audios_pastas FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_audio_permission('canUploadAudio')
    )
  );
CREATE POLICY "update own audio folders"
  ON public.sonoplastia_audios_pastas FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_audio_permission('canUploadAudio')
    )
  )
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own audio folders"
  ON public.sonoplastia_audios_pastas FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_audio_permission('canDeleteOwnLibraryAudio')
    )
  );

CREATE POLICY "view own audio library"
  ON public.sonoplastia_audios_biblioteca FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "insert own audio library"
  ON public.sonoplastia_audios_biblioteca FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_audio_permission('canUploadAudio')
    )
  );
CREATE POLICY "update own audio library"
  ON public.sonoplastia_audios_biblioteca FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_audio_permission('canUploadAudio')
    )
  )
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own audio library"
  ON public.sonoplastia_audios_biblioteca FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_audio_permission('canDeleteOwnLibraryAudio')
    )
  );
