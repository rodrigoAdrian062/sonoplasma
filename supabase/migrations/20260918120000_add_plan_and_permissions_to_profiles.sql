ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{
    "canCreateUnlimitedSections": false,
    "canCreateUnlimitedStages": false,
    "canUsePremiumLibrary": false,
    "canUploadAudio": false,
    "canUseBackup": false,
    "canExportContent": false,
    "canUseAI": false,
    "canManageUsers": false,
    "canManagePermissions": false,
    "canUseAdvancedThemes": false,
    "canUseAdvancedPresentation": false,
    "canAccessEverything": false
  }'::jsonb;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'premium', 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, plan, permissions)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'free',
    '{
      "canCreateUnlimitedSections": false,
      "canCreateUnlimitedStages": false,
      "canUsePremiumLibrary": false,
      "canUploadAudio": false,
      "canUseBackup": false,
      "canExportContent": false,
      "canUseAI": false,
      "canManageUsers": false,
      "canManagePermissions": false,
      "canUseAdvancedThemes": false,
      "canUseAdvancedPresentation": false,
      "canAccessEverything": false
    }'::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE
  SET username = EXCLUDED.username,
      plan = COALESCE(public.profiles.plan, EXCLUDED.plan),
      permissions = COALESCE(public.profiles.permissions, EXCLUDED.permissions);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
