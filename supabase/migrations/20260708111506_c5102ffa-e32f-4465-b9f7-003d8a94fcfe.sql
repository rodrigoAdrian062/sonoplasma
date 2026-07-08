-- ============ STORAGE POLICIES ============
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view stage icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload stage icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update stage icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete stage icons" ON storage.objects;
DROP POLICY IF EXISTS "Public access to audio files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audios" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update audios" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete audios" ON storage.objects;

-- Read: authenticated only (prevents anonymous listing; public object URLs still work)
CREATE POLICY "Read own-bucket files (auth)" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('logos','stage-icons','stage-audios'));

-- Insert: authenticated + must be inside own folder
CREATE POLICY "Upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('logos','stage-icons','stage-audios')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: only own files
CREATE POLICY "Update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('logos','stage-icons','stage-audios')
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('logos','stage-icons','stage-audios')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: only own files
CREATE POLICY "Delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('logos','stage-icons','stage-audios')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============ SECURITY DEFINER FUNCTIONS ============
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_owner_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;