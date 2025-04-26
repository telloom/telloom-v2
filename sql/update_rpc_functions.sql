-- ========================================================
-- Update RPC Functions for Role Resolution
-- ========================================================
-- This script updates the RPC functions to include all necessary
-- properties needed by the API routes.

-- Drop existing function
DROP FUNCTION IF EXISTS get_executor_for_user(uuid);

-- Create updated function with additional information
CREATE OR REPLACE FUNCTION get_executor_for_user(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
DECLARE
  result jsonb;
  is_sharer boolean;
  has_executor_relationship boolean;
  relationships jsonb;
BEGIN
  -- Check if user is a sharer
  SELECT EXISTS (
    SELECT 1
    FROM "ProfileSharer"
    WHERE "profileId" = user_id
  ) INTO is_sharer;
  
  -- Get executor relationships
  SELECT
    jsonb_agg(jsonb_build_object(
      'id', pe.id,
      'sharerId', pe."sharerId"
    ))
  INTO relationships
  FROM "ProfileExecutor" pe
  WHERE pe."executorId" = user_id;
  
  -- Check if user has any executor relationships
  has_executor_relationship := relationships IS NOT NULL AND jsonb_array_length(relationships) > 0;
  
  -- Build result
  result := jsonb_build_object(
    'is_sharer', is_sharer,
    'has_executor_relationship', has_executor_relationship,
    'relationships', COALESCE(relationships, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$;

-- Update the user role emergency function to include more information
CREATE OR REPLACE FUNCTION get_user_role_emergency(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
DECLARE
  result jsonb;
  roles_array jsonb;
  sharer_id uuid;
  is_sharer boolean;
  executor_relationships jsonb;
  has_executor_relationship boolean;
BEGIN
  -- Get roles
  SELECT jsonb_agg(role)
  INTO roles_array
  FROM "ProfileRole"
  WHERE "profileId" = user_id;
  
  -- Get sharer ID if exists
  SELECT id INTO sharer_id
  FROM "ProfileSharer"
  WHERE "profileId" = user_id;
  
  -- Check if user is a sharer
  is_sharer := sharer_id IS NOT NULL;
  
  -- Get executor relationships
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'sharerId', "sharerId"
  ))
  INTO executor_relationships
  FROM "ProfileExecutor"
  WHERE "executorId" = user_id;
  
  -- Check if user has any executor relationships
  has_executor_relationship := executor_relationships IS NOT NULL AND jsonb_array_length(executor_relationships) > 0;
  
  -- Build the result
  result := jsonb_build_object(
    'roles', COALESCE(roles_array, '[]'::jsonb),
    'sharerId', sharer_id,
    'is_sharer', is_sharer,
    'executor_relationships', COALESCE(executor_relationships, '[]'::jsonb),
    'has_executor_relationship', has_executor_relationship,
    'timestamp', CURRENT_TIMESTAMP
  );
  
  RETURN result;
END;
$$; 