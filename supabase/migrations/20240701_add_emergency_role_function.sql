-- This function provides an emergency way to check a user's roles
-- without triggering infinite recursion in RLS policies

-- Drop function if it already exists (for rerunning migration)
DROP FUNCTION IF EXISTS public.get_user_role_emergency;

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_user_role_emergency(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  roles_array TEXT[];
  is_sharer BOOLEAN := FALSE;
  sharer_id UUID := NULL;
  has_executor BOOLEAN := FALSE;
BEGIN
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role_emergency TO authenticated;

-- Add comment explaining function purpose
COMMENT ON FUNCTION public.get_user_role_emergency IS 
'Emergency function to check user roles without triggering infinite recursion in RLS policies. 
This function has SECURITY DEFINER, so it bypasses RLS completely.'; 