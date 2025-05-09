-- supabase/mcp_functions/get_my_auth_role.sql
-- This function returns the current user's auth.role().

CREATE OR REPLACE FUNCTION get_my_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.role()::TEXT;
$$; 