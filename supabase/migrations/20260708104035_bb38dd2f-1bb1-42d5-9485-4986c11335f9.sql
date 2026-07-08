
-- ROLES
CREATE TYPE public.app_role AS ENUM ('super_admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admin can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SIGNUP TRIGGER: create profile + default 'user' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- OWNERSHIP: add owner_id to all data tables
ALTER TABLE public.sonoplastia_secoes ADD COLUMN owner_id uuid;
ALTER TABLE public.sonoplastia_etapas ADD COLUMN owner_id uuid;
ALTER TABLE public.sonoplastia_etapa_audios ADD COLUMN owner_id uuid;
ALTER TABLE public.sonoplastia_audios_biblioteca ADD COLUMN owner_id uuid;
ALTER TABLE public.sonoplastia_audios_pastas ADD COLUMN owner_id uuid;
ALTER TABLE public.sonoplastia_configuracoes ADD COLUMN owner_id uuid;
ALTER TABLE public.sonoplastia_execucoes ADD COLUMN owner_id uuid;

-- Auto-set owner_id on insert (non super-admin -> own space; super-admin -> shared model)
CREATE OR REPLACE FUNCTION public.set_owner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_owner_secoes BEFORE INSERT ON public.sonoplastia_secoes FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();
CREATE TRIGGER set_owner_etapas BEFORE INSERT ON public.sonoplastia_etapas FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();
CREATE TRIGGER set_owner_etapa_audios BEFORE INSERT ON public.sonoplastia_etapa_audios FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();
CREATE TRIGGER set_owner_biblioteca BEFORE INSERT ON public.sonoplastia_audios_biblioteca FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();
CREATE TRIGGER set_owner_pastas BEFORE INSERT ON public.sonoplastia_audios_pastas FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();
CREATE TRIGGER set_owner_config BEFORE INSERT ON public.sonoplastia_configuracoes FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();
CREATE TRIGGER set_owner_execucoes BEFORE INSERT ON public.sonoplastia_execucoes FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

-- Drop old public policies
DROP POLICY "Acesso público para atualizar áudios da biblioteca" ON public.sonoplastia_audios_biblioteca;
DROP POLICY "Acesso público para deletar áudios da biblioteca" ON public.sonoplastia_audios_biblioteca;
DROP POLICY "Acesso público para inserir áudios na biblioteca" ON public.sonoplastia_audios_biblioteca;
DROP POLICY "Acesso público para leitura de áudios da biblioteca" ON public.sonoplastia_audios_biblioteca;
DROP POLICY "Acesso público para atualizar pastas" ON public.sonoplastia_audios_pastas;
DROP POLICY "Acesso público para deletar pastas" ON public.sonoplastia_audios_pastas;
DROP POLICY "Acesso público para inserir pastas" ON public.sonoplastia_audios_pastas;
DROP POLICY "Acesso público para leitura de pastas" ON public.sonoplastia_audios_pastas;
DROP POLICY "Anyone can insert settings" ON public.sonoplastia_configuracoes;
DROP POLICY "Anyone can update settings" ON public.sonoplastia_configuracoes;
DROP POLICY "Anyone can view settings" ON public.sonoplastia_configuracoes;
DROP POLICY "Acesso público para atualizar áudios" ON public.sonoplastia_etapa_audios;
DROP POLICY "Acesso público para deletar áudios" ON public.sonoplastia_etapa_audios;
DROP POLICY "Acesso público para inserir áudios" ON public.sonoplastia_etapa_audios;
DROP POLICY "Acesso público para leitura de áudios" ON public.sonoplastia_etapa_audios;
DROP POLICY "Acesso público para atualizar etapas" ON public.sonoplastia_etapas;
DROP POLICY "Acesso público para deletar etapas" ON public.sonoplastia_etapas;
DROP POLICY "Acesso público para inserir etapas" ON public.sonoplastia_etapas;
DROP POLICY "Acesso público para leitura de etapas" ON public.sonoplastia_etapas;
DROP POLICY "Acesso público para inserir execuções" ON public.sonoplastia_execucoes;
DROP POLICY "Acesso público para leitura de execuções" ON public.sonoplastia_execucoes;
DROP POLICY "Acesso público para atualizar seções" ON public.sonoplastia_secoes;
DROP POLICY "Acesso público para deletar seções" ON public.sonoplastia_secoes;
DROP POLICY "Acesso público para inserir seções" ON public.sonoplastia_secoes;
DROP POLICY "Acesso público para leitura de seções" ON public.sonoplastia_secoes;

-- New tenant-aware policies via a helper approach (explicit per table)
-- SECOES
CREATE POLICY "view own or shared" ON public.sonoplastia_secoes FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());
CREATE POLICY "insert own or admin shared" ON public.sonoplastia_secoes FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "update own or admin shared" ON public.sonoplastia_secoes FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "delete own or admin shared" ON public.sonoplastia_secoes FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));

-- ETAPAS
CREATE POLICY "view own or shared" ON public.sonoplastia_etapas FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());
CREATE POLICY "insert own or admin shared" ON public.sonoplastia_etapas FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "update own or admin shared" ON public.sonoplastia_etapas FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "delete own or admin shared" ON public.sonoplastia_etapas FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));

-- ETAPA_AUDIOS
CREATE POLICY "view own or shared" ON public.sonoplastia_etapa_audios FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());
CREATE POLICY "insert own or admin shared" ON public.sonoplastia_etapa_audios FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "update own or admin shared" ON public.sonoplastia_etapa_audios FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "delete own or admin shared" ON public.sonoplastia_etapa_audios FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));

-- AUDIOS_BIBLIOTECA
CREATE POLICY "view own or shared" ON public.sonoplastia_audios_biblioteca FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());
CREATE POLICY "insert own or admin shared" ON public.sonoplastia_audios_biblioteca FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "update own or admin shared" ON public.sonoplastia_audios_biblioteca FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "delete own or admin shared" ON public.sonoplastia_audios_biblioteca FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));

-- AUDIOS_PASTAS
CREATE POLICY "view own or shared" ON public.sonoplastia_audios_pastas FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());
CREATE POLICY "insert own or admin shared" ON public.sonoplastia_audios_pastas FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "update own or admin shared" ON public.sonoplastia_audios_pastas FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "delete own or admin shared" ON public.sonoplastia_audios_pastas FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));

-- CONFIGURACOES
CREATE POLICY "view own or shared" ON public.sonoplastia_configuracoes FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());
CREATE POLICY "insert own or admin shared" ON public.sonoplastia_configuracoes FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "update own or admin shared" ON public.sonoplastia_configuracoes FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "delete own or admin shared" ON public.sonoplastia_configuracoes FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));

-- EXECUCOES
CREATE POLICY "view own or shared" ON public.sonoplastia_execucoes FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());
CREATE POLICY "insert own or admin shared" ON public.sonoplastia_execucoes FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "update own or admin shared" ON public.sonoplastia_execucoes FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "delete own or admin shared" ON public.sonoplastia_execucoes FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin')));
