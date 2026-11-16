-- Grants the existing, verified master account administrator access.
-- Safe to run more than once. If the account does not exist yet, create it in
-- Supabase Auth first and then run this migration again.
DO $$
DECLARE
  master_user_id uuid;
BEGIN
  SELECT id
    INTO master_user_id
    FROM auth.users
   WHERE lower(email) = 'tunavinetwork@gmail.com'
   LIMIT 1;

  IF master_user_id IS NULL THEN
    RAISE NOTICE 'Master account not found. Create/verify it in Supabase Auth, then rerun this migration.';
  ELSIF NOT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = master_user_id
       AND role = 'admin'::public.app_role
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (master_user_id, 'admin'::public.app_role);
  END IF;
END
$$;
