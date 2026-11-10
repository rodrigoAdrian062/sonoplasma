CREATE POLICY "super admin can view all library audio"
  ON public.sonoplastia_audios_biblioteca
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super admin can view all library folders"
  ON public.sonoplastia_audios_pastas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Read own-bucket files (auth)" ON storage.objects;
CREATE POLICY "Read own-bucket files (auth)" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('logos', 'stage-icons')
    OR (
      bucket_id = 'stage-audios'
      AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.has_role(auth.uid(), 'super_admin')
        OR (
          public.has_audio_permission('canViewGlobalLibrary')
          AND CASE
            WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$'
            THEN public.has_role((storage.foldername(name))[1]::uuid, 'super_admin')
            ELSE false
          END
        )
      )
    )
  );
