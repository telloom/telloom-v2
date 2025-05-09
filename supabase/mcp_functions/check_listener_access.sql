-- supabase/mcp_functions/check_listener_access.sql
-- This function checks if the currently authenticated user (listener) has
-- approved access to a specific sharer's content.
-- p_sharer_id: The UUID of the ProfileSharer record (ProfileSharer.id).

CREATE OR REPLACE FUNCTION public.check_listener_access(p_sharer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth' -- Ensure auth schema is in search_path
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "ProfileListener" pl
    WHERE pl."sharerId" = p_sharer_id  -- Corrected: This is ProfileListener.sharerId (FK to ProfileSharer.id)
      AND pl."listenerId" = auth.uid() -- This is the Profile.id of the current listener
      AND pl."hasAccess" = TRUE
  );
$$; 