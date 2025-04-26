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
  active_role TEXT;
  is_sharer BOOLEAN := FALSE;
  sharer_id UUID := NULL;
  has_executor BOOLEAN := FALSE;
  executor_count INT := 0;
  executor_relationships JSONB[];
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  -- Return null if no authenticated user
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get user metadata for active role
  SELECT (auth.jwt() ->> 'app_metadata')::JSONB ->> 'activeRole'
  INTO active_role;

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
  
  -- Check if user has any executor relationships and count them
  SELECT 
    EXISTS (SELECT 1 FROM "ProfileExecutor" WHERE "executorId" = user_id),
    COUNT(*)
  INTO has_executor, executor_count
  FROM "ProfileExecutor" 
  WHERE "executorId" = user_id;

  -- Get executor relationships if any exist
  IF has_executor THEN
    SELECT ARRAY_AGG(
      jsonb_build_object(
        'id', e.id,
        'sharerId', e."sharerId",
        'firstName', p."firstName",
        'lastName', p."lastName"
      )
    )
    INTO executor_relationships
    FROM "ProfileExecutor" e
    JOIN "ProfileSharer" s ON e."sharerId" = s.id
    JOIN "Profile" p ON s."profileId" = p.id
    WHERE e."executorId" = user_id;
  END IF;
  
  -- Build the result object
  result := jsonb_build_object(
    'roles', COALESCE(roles_array, ARRAY[]::TEXT[]),
    'activeRole', active_role,
    'is_sharer', is_sharer,
    'sharerId', sharer_id,
    'has_executor_relationship', has_executor,
    'executor_count', executor_count,
    'executor_relationships', COALESCE(executor_relationships, ARRAY[]::JSONB[]),
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