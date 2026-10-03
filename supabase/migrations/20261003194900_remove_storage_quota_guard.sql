DROP TRIGGER IF EXISTS enforce_project_storage_quota ON storage.objects;
DROP FUNCTION IF EXISTS private.enforce_storage_quota();
DROP TABLE IF EXISTS private.storage_quota_usage;
