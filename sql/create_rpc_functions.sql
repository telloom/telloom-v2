-- ========================================================
-- RPC Functions to Bypass RLS for Emergency Role Resolution
-- ========================================================
-- These functions provide safe ways to retrieve role information
-- even when RLS recursion issues occur. They use SECURITY DEFINER
-- to bypass RLS when needed.

-- Emergency RPC functions for bypassing RLS for role resolution
-- These functions are used when there are infinite recursion issues with RLS policies
-- Drop existing functions
DROP FUNCTION IF EXISTS get_executor_for_user(uuid);
DROP FUNCTION IF EXISTS get_user_role_emergency(uuid);

-- Function to get executor relationship for a user
CREATE OR REPLACE FUNCTION get_executor_for_user(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
  has_executor boolean;
  is_sharer boolean;
BEGIN
  -- Check if user is a sharer first
  SELECT EXISTS (
    SELECT 1 FROM "ProfileSharer" WHERE "profileId" = user_id
  ) INTO is_sharer;
  
  -- Check if user has executor relationships
  SELECT EXISTS (
    SELECT 1 FROM "ProfileExecutor" WHERE "executorId" = user_id
  ) INTO has_executor;
  
  -- Get executor relationships if they exist
  SELECT jsonb_build_object(
    'is_sharer', is_sharer,
    'has_executor_relationship', has_executor,
    'relationships', CASE 
      WHEN has_executor THEN 
        (SELECT jsonb_agg(jsonb_build_object('id', pe.id, 'sharerId', pe."sharerId"))
         FROM "ProfileExecutor" pe
         WHERE pe."executorId" = user_id)
      ELSE jsonb_build_array()
    END
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if the user is an admin via metadata or has ADMIN role
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND ((raw_app_meta_data->>'role')::text = 'admin' 
         OR COALESCE((raw_app_meta_data->>'is_super_admin')::boolean, false) = true)
  ) OR EXISTS (
    SELECT 1 FROM "ProfileRole" WHERE "profileId" = user_id AND role = 'ADMIN'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- Function to check if a user has access to a sharer's content (bypassing RLS)
CREATE OR REPLACE FUNCTION has_sharer_access_check(user_id uuid, sharer_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_owner boolean;
  is_executor boolean;
BEGIN
  -- Check if user is admin
  SELECT is_admin(user_id) INTO is_admin;
  
  IF is_admin THEN
    RETURN true;
  END IF;
  
  -- Check if user is the owner of the sharer profile
  SELECT EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = sharer_id AND ps."profileId" = user_id
  ) INTO is_owner;
  
  IF is_owner THEN
    RETURN true;
  END IF;
  
  -- Check if user is an executor for this sharer
  SELECT EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = sharer_id AND pe."executorId" = user_id
  ) INTO is_executor;
  
  RETURN is_executor;
END;
$$;

-- Emergency function to get role information when RLS is causing issues
CREATE OR REPLACE FUNCTION get_user_role_emergency(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
  user_roles text[];
  sharer_record_id uuid;
  executor_info jsonb;
  has_sharer boolean;
BEGIN
  -- Get roles from ProfileRole
  SELECT array_agg(role::text) INTO user_roles
  FROM "ProfileRole"
  WHERE "profileId" = user_id;
  
  -- Check if user has a sharer profile
  SELECT EXISTS (
    SELECT 1 FROM "ProfileSharer" WHERE "profileId" = user_id
  ) INTO has_sharer;
  
  -- Get sharer ID if user is a sharer
  IF has_sharer THEN
    SELECT id INTO sharer_record_id
    FROM "ProfileSharer"
    WHERE "profileId" = user_id;
  END IF;
  
  -- Get executor info
  SELECT get_executor_for_user(user_id) INTO executor_info;
  
  -- Build result object
  SELECT jsonb_build_object(
    'roles', COALESCE(user_roles, ARRAY[]::text[]),
    'sharerId', sharer_record_id,
    'is_sharer', has_sharer,
    'executor_relationships', 
      CASE WHEN (executor_info->>'has_executor_relationship')::boolean 
        THEN executor_info->'relationships'
        ELSE jsonb_build_array()
      END,
    'has_executor_relationship', 
      COALESCE((executor_info->>'has_executor_relationship')::boolean, false),
    'timestamp', now()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Safe function to get profile information
CREATE OR REPLACE FUNCTION get_profile_safe(target_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  profile_record jsonb;
BEGIN
  -- Get profile data
  SELECT jsonb_build_object(
    'id', p.id,
    'fullName', p."fullName",
    'displayName', COALESCE(p."fullName", CONCAT(p."firstName", ' ', p."lastName")),
    'email', p.email,
    'firstName', p."firstName",
    'lastName', p."lastName",
    'avatarUrl', p."avatarUrl",
    'phone', p."phone",
    'isAdmin', p."isAdmin",
    'createdAt', p."createdAt",
    'updatedAt', p."updatedAt"
  )
  INTO profile_record
  FROM "Profile" p
  WHERE p.id = target_user_id;
  
  RETURN profile_record;
END;
$$; 