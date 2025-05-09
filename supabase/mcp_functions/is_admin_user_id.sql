CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_super_admin boolean;
BEGIN
  -- Check the is_super_admin flag in the auth.users table for the provided user ID
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p_user_id AND u.is_super_admin = true
  ) INTO v_is_super_admin;

  RETURN v_is_super_admin;
END;
$function$; 