-- supabase/migrations/0011_create_has_listener_access_function.sql
-- This migration creates the has_listener_access function.

-- Function: public.has_listener_access(sharer_id uuid)
-- Description: Checks if the currently authenticated user (auth.uid()) is an approved listener
--              for the specified sharer_id by verifying an entry in the ProfileListener table
--              where hasAccess is true.
-- Parameters:
--   sharer_id uuid: The UUID of the profileSharer to check access against.
-- Returns:
--   boolean: True if the user is an approved listener, false otherwise.

CREATE OR REPLACE FUNCTION public.has_listener_access(sharer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "ProfileListener" pl
    WHERE pl."profileSharerId" = sharer_id
      AND pl."profileUserId" = auth.uid()
      AND pl."hasAccess" = TRUE
  );
$$;

COMMENT ON FUNCTION public.has_listener_access(uuid) IS 'Checks if the current user is an approved listener for a specific sharer profile.'; 