-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_pending_invitations(text, text);

-- Then recreate with the type cast for the role comparison
CREATE OR REPLACE FUNCTION public.get_pending_invitations(email_param text, role_type text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Using a direct approach that avoids RLS policies
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'token', i.token,
        'createdAt', i."createdAt",
        'sharerId', i."sharerId",
        'inviteeEmail', i."inviteeEmail",
        'role', i.role,
        'status', i.status,
        'sharer', jsonb_build_object(
          'id', ps.id,
          'profile', jsonb_build_object(
            'id', p.id,
            'firstName', p."firstName",
            'lastName', p."lastName",
            'email', p.email,
            'avatarUrl', p."avatarUrl"
          )
        )
      )
    )
  INTO result
  FROM "Invitation" i
  JOIN "ProfileSharer" ps ON i."sharerId" = ps.id
  JOIN "Profile" p ON ps."profileId" = p.id
  WHERE 
    i."inviteeEmail" = email_param 
    AND i.status = 'PENDING'
    AND (role_type IS NULL OR i.role::text = role_type);

  -- Return empty array if no results
  IF result IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN result;
END;
$$; 