CREATE OR REPLACE FUNCTION public.has_audio_permission(permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT permissions -> permission_key = 'true'::jsonb
      OR permissions -> 'canAccessEverything' = 'true'::jsonb
    FROM public.profiles
    WHERE user_id = auth.uid()
  ), false);
$$;

REVOKE EXECUTE ON FUNCTION public.has_audio_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_audio_permission(text) TO authenticated;

UPDATE public.profiles
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object(
  'canDeleteOwnLibraryAudio',
  COALESCE(permissions -> 'canDeleteOwnLibraryAudio' = 'true'::jsonb, plan IN ('premium', 'admin')),
  'canViewGlobalLibrary',
  COALESCE(permissions -> 'canViewGlobalLibrary' = 'true'::jsonb, plan IN ('premium', 'admin'))
);

CREATE OR REPLACE FUNCTION public.prevent_user_access_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id
    AND NOT public.has_role(auth.uid(), 'super_admin')
    AND (NEW.plan IS DISTINCT FROM OLD.plan OR NEW.permissions IS DISTINCT FROM OLD.permissions)
  THEN
    RAISE EXCEPTION 'Somente o administrador pode alterar o plano e as permissões.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_user_access_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_access_escalation();

DROP POLICY IF EXISTS "view own" ON public.sonoplastia_audios_biblioteca;
DROP POLICY IF EXISTS "insert own" ON public.sonoplastia_audios_biblioteca;
DROP POLICY IF EXISTS "update own" ON public.sonoplastia_audios_biblioteca;
DROP POLICY IF EXISTS "delete own" ON public.sonoplastia_audios_biblioteca;

CREATE POLICY "view permitted audio library" ON public.sonoplastia_audios_biblioteca
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (
      (owner_id IS NULL OR public.has_role(owner_id, 'super_admin'))
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_audio_permission('canViewGlobalLibrary')
      )
    )
  );

CREATE POLICY "insert permitted audio library" ON public.sonoplastia_audios_biblioteca
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_audio_permission('canUploadAudio')
    )
  );

CREATE POLICY "update permitted audio library" ON public.sonoplastia_audios_biblioteca
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
  )
  WITH CHECK (
    (
      owner_id = auth.uid()
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_audio_permission('canUploadAudio')
      )
    )
    OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "delete permitted audio library" ON public.sonoplastia_audios_biblioteca
  FOR DELETE TO authenticated
  USING (
    (owner_id = auth.uid() AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_audio_permission('canDeleteOwnLibraryAudio')
    ))
    OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
  );

DROP POLICY IF EXISTS "view own" ON public.sonoplastia_audios_pastas;
DROP POLICY IF EXISTS "insert own" ON public.sonoplastia_audios_pastas;
DROP POLICY IF EXISTS "update own" ON public.sonoplastia_audios_pastas;
DROP POLICY IF EXISTS "delete own" ON public.sonoplastia_audios_pastas;

CREATE POLICY "view permitted audio folders" ON public.sonoplastia_audios_pastas
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (
      (owner_id IS NULL OR public.has_role(owner_id, 'super_admin'))
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_audio_permission('canViewGlobalLibrary')
      )
    )
  );

CREATE POLICY "insert permitted audio folders" ON public.sonoplastia_audios_pastas
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_audio_permission('canUploadAudio')
    )
  );

CREATE POLICY "update permitted audio folders" ON public.sonoplastia_audios_pastas
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
  )
  WITH CHECK (
    (
      owner_id = auth.uid()
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_audio_permission('canUploadAudio')
      )
    )
    OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "delete permitted audio folders" ON public.sonoplastia_audios_pastas
  FOR DELETE TO authenticated
  USING (
    (owner_id = auth.uid() AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_audio_permission('canDeleteOwnLibraryAudio')
    ))
    OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
  );

DROP POLICY IF EXISTS "Upload own files" ON storage.objects;
CREATE POLICY "Upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      bucket_id IN ('logos', 'stage-icons')
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    OR (
      bucket_id = 'stage-audios'
      AND (storage.foldername(name))[1] = auth.uid()::text
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_audio_permission('canUploadAudio')
      )
    )
  );

DROP POLICY IF EXISTS "Read own-bucket files (auth)" ON storage.objects;
CREATE POLICY "Read own-bucket files (auth)" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('logos', 'stage-icons')
    OR (
      bucket_id = 'stage-audios'
      AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (
          (
            public.has_role(auth.uid(), 'super_admin')
            OR public.has_audio_permission('canViewGlobalLibrary')
          )
          AND CASE
            WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$'
            THEN public.has_role((storage.foldername(name))[1]::uuid, 'super_admin')
            ELSE false
          END
        )
      )
    )
  );

DROP POLICY IF EXISTS "Update own files" ON storage.objects;
CREATE POLICY "Update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    (
      bucket_id IN ('logos', 'stage-icons')
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    OR (
      bucket_id = 'stage-audios'
      AND (storage.foldername(name))[1] = auth.uid()::text
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_audio_permission('canUploadAudio')
      )
    )
  )
  WITH CHECK (
    (
      bucket_id IN ('logos', 'stage-icons')
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    OR (
      bucket_id = 'stage-audios'
      AND (storage.foldername(name))[1] = auth.uid()::text
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_audio_permission('canUploadAudio')
      )
    )
  );

DROP POLICY IF EXISTS "Delete own files" ON storage.objects;
CREATE POLICY "Delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    (bucket_id IN ('logos', 'stage-icons') AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (
      bucket_id = 'stage-audios'
      AND (storage.foldername(name))[1] = auth.uid()::text
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_audio_permission('canDeleteOwnLibraryAudio')
      )
    )
  );
