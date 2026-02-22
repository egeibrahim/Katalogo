-- Create an atomic first-admin claim function to avoid race conditions
CREATE OR REPLACE FUNCTION public.claim_first_admin(claiming_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow an authenticated user to claim for themselves
  IF auth.uid() IS NULL OR auth.uid() <> claiming_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Serialize concurrent claims
  PERFORM pg_advisory_xact_lock(hashtext('claim_first_admin'));

  -- If any admin exists, deny claim
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN FALSE;
  END IF;

  -- Promote caller to admin (they may already have a 'user' row)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (claiming_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN TRUE;
END;
$$;

-- Restrict execution to authenticated users only
REVOKE ALL ON FUNCTION public.claim_first_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_first_admin(uuid) TO authenticated;
