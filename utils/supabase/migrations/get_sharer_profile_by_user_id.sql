-- This function safely gets a user's ProfileSharer ID without triggering RLS infinite recursion
CREATE OR REPLACE FUNCTION get_sharer_profile_by_user_id(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'sharerId', ps.id,
    'profileId', ps."profileId",
    'exists', true
  )
  INTO result
  FROM "ProfileSharer" ps
  WHERE ps."profileId" = user_id;

  -- Return empty object with exists=false if no sharer profile found
  IF result IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  RETURN result;
END;
$$; 