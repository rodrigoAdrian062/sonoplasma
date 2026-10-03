CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

LOCK TABLE storage.objects IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE COALESCE(metadata->>'size', '') !~ '^[0-9]+$'
  ) THEN
    RAISE EXCEPTION 'Storage quota guard cannot be enabled: existing objects with unknown sizes must be investigated first.';
  END IF;
END;
$$;

CREATE TABLE private.storage_quota_usage (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  used_bytes bigint NOT NULL CHECK (used_bytes >= 0),
  limit_bytes bigint NOT NULL CHECK (limit_bytes > 0)
);

INSERT INTO private.storage_quota_usage (singleton, used_bytes, limit_bytes)
SELECT
  true,
  COALESCE(SUM(COALESCE((metadata->>'size')::bigint, 0)), 0),
  800 * 1024 * 1024
FROM storage.objects;

REVOKE ALL ON private.storage_quota_usage FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.enforce_storage_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  current_bytes bigint;
  max_bytes bigint;
  old_size bigint := 0;
  new_size bigint := 0;
  delta_bytes bigint;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_size := COALESCE((OLD.metadata->>'size')::bigint, 0);
  END IF;

  IF TG_OP <> 'DELETE' THEN
    IF NEW.metadata->>'size' IS NULL THEN
      RAISE EXCEPTION 'Não foi possível verificar o tamanho do arquivo; envio bloqueado por segurança.'
        USING ERRCODE = 'P0001';
    END IF;
    new_size := (NEW.metadata->>'size')::bigint;
  END IF;

  delta_bytes := new_size - old_size;

  SELECT used_bytes, limit_bytes
    INTO current_bytes, max_bytes
    FROM private.storage_quota_usage
    WHERE singleton = true
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Controle de armazenamento indisponível; envio bloqueado por segurança.'
      USING ERRCODE = 'P0001';
  END IF;

  IF delta_bytes > 0 AND current_bytes + delta_bytes > max_bytes THEN
    RAISE EXCEPTION 'Limite de armazenamento do projeto atingido (800 MB). Remova arquivos que não usa antes de enviar outros.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE private.storage_quota_usage
    SET used_bytes = GREATEST(used_bytes + delta_bytes, 0)
    WHERE singleton = true;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_storage_quota() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enforce_project_storage_quota
BEFORE INSERT OR UPDATE OR DELETE ON storage.objects
FOR EACH ROW
EXECUTE FUNCTION private.enforce_storage_quota();

UPDATE storage.buckets
SET file_size_limit = 20 * 1024 * 1024
WHERE id = 'stage-audios';

UPDATE storage.buckets
SET file_size_limit = 5 * 1024 * 1024
WHERE id = 'stage-icons';

UPDATE storage.buckets
SET file_size_limit = 3 * 1024 * 1024
WHERE id = 'logos';
