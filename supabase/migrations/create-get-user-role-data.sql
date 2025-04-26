-- This function provides comprehensive user role data
-- for middleware and other components

-- Drop function if it already exists (for clean updates)
DROP FUNCTION IF EXISTS public.get_user_role_data;

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_user_role_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  user_id UUID;
  roles_array TEXT[];
  is_sharer BOOLEAN := FALSE;
  sharer_id UUID := NULL;
  has_executor BOOLEAN := FALSE;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  -- Return null if no authenticated user
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Directly query roles to avoid RLS issues
  SELECT ARRAY_AGG(role::TEXT)
  INTO roles_array
  FROM "ProfileRole"
  WHERE "profileId" = user_id;
  
  -- Check if user is a sharer
  SELECT EXISTS (
    SELECT 1 FROM "ProfileRole" WHERE "profileId" = user_id AND role = 'SHARER'
  ) INTO is_sharer;
  
  -- Get sharer ID if one exists
  IF is_sharer THEN
    SELECT id INTO sharer_id
    FROM "ProfileSharer"
    WHERE "profileId" = user_id
    LIMIT 1;
  END IF;
  
  -- Check if user has any executor relationships
  SELECT EXISTS (
    SELECT 1 FROM "ProfileExecutor" WHERE "executorId" = user_id
  ) INTO has_executor;
  
  -- Build the result object
  result := jsonb_build_object(
    'roles', COALESCE(roles_array, ARRAY[]::TEXT[]),
    'is_sharer', is_sharer,
    'sharerId', sharer_id,
    'has_executor_relationship', has_executor,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to all relevant roles
GRANT EXECUTE ON FUNCTION public.get_user_role_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_data TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role_data TO service_role;

-- Add comment explaining function purpose
COMMENT ON FUNCTION public.get_user_role_data IS 
'Function to get comprehensive user role data for middleware and other components.
Returns null if no authenticated user, otherwise returns roles array, sharer status, and executor status.'; 