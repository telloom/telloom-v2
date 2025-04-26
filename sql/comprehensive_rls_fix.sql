-- Comprehensive fix for RLS infinite recursion issues and missing functions
-- This script ensures all necessary helper functions and RPC functions are created correctly

-- 1. First, disable RLS temporarily on problem tables to avoid errors during setup
ALTER TABLE "ProfileSharer" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileExecutor" DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies that might be causing infinite recursion
DROP POLICY IF EXISTS "ProfileSharer_access_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_admin_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_owner_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_executor_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_admin_direct_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_owner_direct_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_executor_direct_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_admin_simple_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_owner_simple_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_executor_simple_policy" ON "ProfileSharer";

DROP POLICY IF EXISTS "ProfileExecutor_access_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_admin_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_owner_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_sharer_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_admin_direct_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_owner_direct_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_sharer_direct_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_admin_simple_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_owner_simple_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_sharer_simple_policy" ON "ProfileExecutor";

-- 3. Create or update essential helper functions

-- Simple admin check that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.is_admin_simple()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND ((raw_app_meta_data->>'role')::text = 'admin' 
         OR COALESCE((raw_app_meta_data->>'is_super_admin')::boolean, false) = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Direct sharer access check without using helper functions
CREATE OR REPLACE FUNCTION public.check_direct_sharer_access(sharer_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Simple direct check if the current user is the sharer (by profileId)
  RETURN EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = sharer_id AND ps."profileId" = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Direct executor access check without using helper functions
CREATE OR REPLACE FUNCTION public.check_direct_executor_access(sharer_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Simple direct check if the current user is an executor for the sharer
  RETURN EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = sharer_id AND pe."executorId" = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Composite function for content tables - this is safe to use for non-base tables
CREATE OR REPLACE FUNCTION public.has_sharer_access(sharer_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN public.is_admin_simple() OR 
         public.check_direct_sharer_access(sharer_id) OR 
         public.check_direct_executor_access(sharer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the get_user_role_emergency function that your code depends on
CREATE OR REPLACE FUNCTION get_user_role_emergency(user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
  user_roles text[];
  sharer_record_id uuid;
  has_sharer boolean;
  has_executor boolean;
  executor_relationships json;
BEGIN
  -- Get roles from ProfileRole directly
  SELECT array_agg(role::text) INTO user_roles
  FROM "ProfileRole"
  WHERE "profileId" = user_id;
  
  -- Check if user has a sharer profile directly
  SELECT 
    EXISTS (SELECT 1 FROM "ProfileSharer" WHERE "profileId" = user_id),
    (SELECT id FROM "ProfileSharer" WHERE "profileId" = user_id)
  INTO has_sharer, sharer_record_id;
  
  -- Check if user has executor relationships directly
  SELECT 
    EXISTS (SELECT 1 FROM "ProfileExecutor" WHERE "executorId" = user_id),
    (SELECT json_agg(json_build_object('id', pe.id, 'sharerId', pe."sharerId"))
     FROM "ProfileExecutor" pe
     WHERE pe."executorId" = user_id)
  INTO has_executor, executor_relationships;
  
  -- Build result object with simple direct queries
  SELECT jsonb_build_object(
    'roles', COALESCE(user_roles, ARRAY[]::text[]),
    'sharerId', sharer_record_id,
    'is_sharer', has_sharer,
    'executor_relationships', COALESCE(executor_relationships, '[]'::json),
    'has_executor_relationship', has_executor,
    'timestamp', now()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 5. Update the get_executor_for_user function with enhanced profile data
CREATE OR REPLACE FUNCTION get_executor_for_user(user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
  executor_relationships json;
  has_executor boolean;
  is_sharer boolean;
  sharer_id uuid;
BEGIN
  -- Check if user is a sharer
  SELECT 
    EXISTS (SELECT 1 FROM "ProfileSharer" ps
            WHERE ps."profileId" = user_id),
    (SELECT ps.id FROM "ProfileSharer" ps
     WHERE ps."profileId" = user_id
     LIMIT 1)
  INTO is_sharer, sharer_id;

  -- Check if user has executor relationships
  SELECT 
    EXISTS (SELECT 1 FROM "ProfileExecutor" pe
            WHERE pe."executorId" = user_id)
  INTO has_executor;

  -- Directly get executor relationships with full profile data
  SELECT 
    json_agg(json_build_object(
      'id', pe.id, 
      'sharerId', pe."sharerId",
      'executorId', pe."executorId",
      'createdAt', COALESCE(pe."createdAt", now()),
      'sharer', json_build_object(
        'id', ps.id,
        'profileId', ps."profileId",
        'profile', json_build_object(
          'id', p.id,
          'firstName', p."firstName",
          'lastName', p."lastName",
          'email', p.email,
          'avatarUrl', p."avatarUrl",
          'createdAt', p."createdAt"
        )
      )
    ))
  FROM "ProfileExecutor" pe
  JOIN "ProfileSharer" ps ON ps.id = pe."sharerId"
  JOIN "Profile" p ON p.id = ps."profileId"
  WHERE pe."executorId" = user_id
  INTO executor_relationships;
  
  -- Build result
  SELECT jsonb_build_object(
    'executor_relationships', COALESCE(executor_relationships, '[]'::json),
    'has_executor_relationship', has_executor,
    'is_sharer', is_sharer,
    'sharer_id', sharer_id,
    'timestamp', now()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 6. Re-enable RLS on base tables
ALTER TABLE "ProfileSharer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileExecutor" ENABLE ROW LEVEL SECURITY;

-- 7. Add simple RLS policies for ProfileSharer
CREATE POLICY "ProfileSharer_admin_simple_policy" ON "ProfileSharer"
  FOR ALL USING (public.is_admin_simple()) WITH CHECK (public.is_admin_simple());

CREATE POLICY "ProfileSharer_owner_simple_policy" ON "ProfileSharer"  
  FOR ALL USING ("profileId" = auth.uid()) WITH CHECK ("profileId" = auth.uid());

-- Separate policy for executors that only gives read access
CREATE POLICY "ProfileSharer_executor_simple_policy" ON "ProfileSharer"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = "ProfileSharer"."id" AND pe."executorId" = auth.uid()
  ));

-- 8. Add simple RLS policies for ProfileExecutor
CREATE POLICY "ProfileExecutor_admin_simple_policy" ON "ProfileExecutor"
  FOR ALL USING (public.is_admin_simple()) WITH CHECK (public.is_admin_simple());

CREATE POLICY "ProfileExecutor_owner_simple_policy" ON "ProfileExecutor"
  FOR ALL USING ("executorId" = auth.uid()) WITH CHECK ("executorId" = auth.uid());

-- This allows a sharer to manage their executor relationships
CREATE POLICY "ProfileExecutor_sharer_simple_policy" ON "ProfileExecutor"
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "ProfileExecutor"."sharerId" AND ps."profileId" = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "ProfileExecutor"."sharerId" AND ps."profileId" = auth.uid()
  ));

-- 9. Create a safe get_profile function
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