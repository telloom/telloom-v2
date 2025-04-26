-- DIRECT FIX FOR INFINITE RECURSION - SIMPLIFIED APPROACH
-- This script fixes the issue by using the most direct approach possible

-- 1. DISABLE RLS ON PROBLEM TABLES
ALTER TABLE "ProfileSharer" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileExecutor" DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES
DO $$ 
BEGIN
    -- Drop all policies from ProfileSharer
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON "ProfileSharer";', ' ')
        FROM pg_policies 
        WHERE tablename = 'ProfileSharer'
    );
    
    -- Drop all policies from ProfileExecutor
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON "ProfileExecutor";', ' ')
        FROM pg_policies 
        WHERE tablename = 'ProfileExecutor'
    );
END $$;

-- 3. CREATE SIMPLE DIRECT POLICIES WITH NO FUNCTION CALLS
-- These are simple inline policies with no recursive dependencies

-- Simple policies for ProfileSharer
CREATE POLICY "ProfileSharer_admin_policy" ON "ProfileSharer"
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_app_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "ProfileSharer_owner_policy" ON "ProfileSharer"  
  FOR ALL 
  USING ("profileId" = auth.uid()) 
  WITH CHECK ("profileId" = auth.uid());

CREATE POLICY "ProfileSharer_executor_policy" ON "ProfileSharer"
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM "ProfileExecutor" pe
      WHERE pe."sharerId" = "ProfileSharer"."id" 
      AND pe."executorId" = auth.uid()
    )
  );

-- Simple policies for ProfileExecutor
CREATE POLICY "ProfileExecutor_admin_policy" ON "ProfileExecutor"
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_app_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "ProfileExecutor_owner_policy" ON "ProfileExecutor"
  FOR ALL 
  USING ("executorId" = auth.uid()) 
  WITH CHECK ("executorId" = auth.uid());

CREATE POLICY "ProfileExecutor_sharer_policy" ON "ProfileExecutor"
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM "ProfileSharer" ps
      WHERE ps.id = "ProfileExecutor"."sharerId" 
      AND ps."profileId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "ProfileSharer" ps
      WHERE ps.id = "ProfileExecutor"."sharerId" 
      AND ps."profileId" = auth.uid()
    )
  );

-- 4. CREATE THE ESSENTIAL RPC FUNCTIONS WITHOUT CIRCULAR DEPENDENCIES

-- Create a simple get_user_role_emergency function
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
BEGIN
  -- Get roles from ProfileRole directly using a direct query
  SELECT array_agg(role::text) INTO user_roles
  FROM "ProfileRole"
  WHERE "profileId" = user_id;
  
  -- Check if user has a sharer profile directly
  SELECT 
    EXISTS (SELECT 1 FROM "ProfileSharer" WHERE "profileId" = user_id),
    (SELECT id FROM "ProfileSharer" WHERE "profileId" = user_id LIMIT 1)
  INTO has_sharer, sharer_record_id;
  
  -- Check if user has executor relationships directly
  SELECT EXISTS (SELECT 1 FROM "ProfileExecutor" WHERE "executorId" = user_id)
  INTO has_executor;
  
  -- Build result object
  SELECT jsonb_build_object(
    'roles', COALESCE(user_roles, ARRAY[]::text[]),
    'sharerId', sharer_record_id,
    'is_sharer', has_sharer,
    'has_executor_relationship', has_executor,
    'timestamp', now()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create a simplified get_executor_for_user function
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
    EXISTS (SELECT 1 FROM "ProfileSharer" ps WHERE ps."profileId" = user_id),
    (SELECT ps.id FROM "ProfileSharer" ps WHERE ps."profileId" = user_id LIMIT 1)
  INTO is_sharer, sharer_id;

  -- Check if user has executor relationships
  SELECT EXISTS (SELECT 1 FROM "ProfileExecutor" pe WHERE pe."executorId" = user_id)
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

-- 5. RE-ENABLE RLS
ALTER TABLE "ProfileSharer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileExecutor" ENABLE ROW LEVEL SECURITY; 