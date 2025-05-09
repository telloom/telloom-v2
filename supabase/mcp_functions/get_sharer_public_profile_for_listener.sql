-- supabase/mcp_functions/get_sharer_public_profile_for_listener.sql
-- Fetches basic public profile information for a sharer, intended for listeners.
-- Ensures the calling user has listener access before returning data.

CREATE OR REPLACE FUNCTION public.get_sharer_public_profile_for_listener(p_sharer_id uuid)
RETURNS TABLE(profile_first_name text, profile_last_name text, profile_avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- First, verify the calling user (listener) has approved access to the p_sharer_id
  IF NOT public.check_listener_access(p_sharer_id) THEN
    -- If access is denied, raise an exception.
    -- The client-side .rpc call will receive this as an error.
    RAISE EXCEPTION 'User does not have permission to view this sharer''s profile. SharerID: %, UserID: %', p_sharer_id, auth.uid();
  END IF;

  -- If access is confirmed, return the profile details
  RETURN QUERY
  SELECT
    p."firstName",  -- Direct column name from Profile table
    p."lastName",   -- Direct column name
    p."avatarUrl"   -- Direct column name
  FROM "Profile" p
  JOIN "ProfileSharer" ps ON p.id = ps."profileId" -- Join Profile to ProfileSharer
  WHERE ps.id = p_sharer_id; -- Filter ProfileSharer by the p_sharer_id (which is ProfileSharer.id)
END;
$$;

-- Grant execute permission to the 'authenticated' role
GRANT EXECUTE ON FUNCTION public.get_sharer_public_profile_for_listener(uuid) TO authenticated; 