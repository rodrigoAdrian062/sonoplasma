CREATE OR REPLACE FUNCTION public.set_owner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL
     AND (
       TG_TABLE_NAME IN (
         'sonoplastia_secoes',
         'sonoplastia_etapas',
         'sonoplastia_etapa_audios',
         'sonoplastia_audios_biblioteca',
         'sonoplastia_audios_pastas'
       )
       OR NOT public.has_role(auth.uid(), 'super_admin')
     ) THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
