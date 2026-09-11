INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users WHERE email = 'rodrigoadrian062@hotmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles
WHERE role = 'user'::app_role
  AND user_id IN (SELECT id FROM auth.users WHERE email = 'rodrigoadrian062@hotmail.com');