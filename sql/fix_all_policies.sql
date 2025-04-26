-- ========================================================
-- Comprehensive Fix for RLS Infinite Recursion
-- ========================================================
-- This script:
-- 1. Identifies all policies that depend on has_sharer_access
-- 2. Drops those policies
-- 3. Redefines the helper functions to avoid recursion
-- 4. Recreates the base policies for ProfileSharer and ProfileExecutor
-- 5. Recreates all dependent policies
-- 6. Creates RPC functions for emergency access

-- ========================================================
-- STEP 1: Identify all dependent policies
-- ========================================================

-- Create a temporary table to store dependent policies
CREATE TEMP TABLE dependent_policies AS
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    qual::text LIKE '%has_sharer_access%' OR 
    with_check::text LIKE '%has_sharer_access%';

-- Output the policies we found (for logging)
SELECT * FROM dependent_policies;

-- ========================================================
-- STEP 2: Drop existing policies to prevent dependency issues
-- ========================================================

-- Drop policies on ProfileSharer table
DROP POLICY IF EXISTS "Profiles can view own sharer" ON "ProfileSharer";
DROP POLICY IF EXISTS "Profiles can update own sharer" ON "ProfileSharer";
DROP POLICY IF EXISTS "Profiles can delete own sharer" ON "ProfileSharer";
DROP POLICY IF EXISTS "Profiles can insert own sharer" ON "ProfileSharer";
DROP POLICY IF EXISTS "Executors can view sharers they represent" ON "ProfileSharer";

-- Drop policies on ProfileExecutor table
DROP POLICY IF EXISTS "Sharers can manage executors" ON "ProfileExecutor";
DROP POLICY IF EXISTS "Executors can view own relationships" ON "ProfileExecutor";
DROP POLICY IF EXISTS "Admins can manage all executors" ON "ProfileExecutor";

-- ========================================================
-- STEP 3: Redefine helper functions to avoid recursion
-- ========================================================

-- Drop existing helper functions WITH CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.has_sharer_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Create a base-level function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(
      (
        SELECT
          CASE
            WHEN raw_app_meta_data->>'role' = 'admin' THEN TRUE
            WHEN raw_app_meta_data->'is_super_admin' = 'true' THEN TRUE
            ELSE FALSE
          END
        FROM auth.users
        WHERE id = auth.uid()
      ),
      FALSE
    )
$$;

-- Create a base-level function to check if a user is the owner of a ProfileSharer record
CREATE OR REPLACE FUNCTION public.is_sharer_owner(sharer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "ProfileSharer" ps
    WHERE ps.id = sharer_id
      AND ps."profileId" = auth.uid()
  )
$$;

-- Create a base-level function to check if a user is an executor for a sharer
CREATE OR REPLACE FUNCTION public.is_executor_for_sharer(sharer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = sharer_id
      AND pe."executorId" = auth.uid()
  )
$$;

-- Recreate the has_sharer_access function using the base-level functions
CREATE OR REPLACE FUNCTION public.has_sharer_access(sharer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE
      WHEN public.is_admin() THEN TRUE
      WHEN public.is_sharer_owner(sharer_id) THEN TRUE
      WHEN public.is_executor_for_sharer(sharer_id) THEN TRUE
      ELSE FALSE
    END
$$;

-- ========================================================
-- STEP 4: Create direct RLS policies for ProfileSharer table
-- ========================================================

-- Allow profiles to view their own sharer record
CREATE POLICY "Profiles can view own sharer" ON "ProfileSharer"
  FOR SELECT
  USING (
    "profileId" = auth.uid() OR
    public.is_admin()
  );

-- Allow profiles to insert their own sharer record
CREATE POLICY "Profiles can insert own sharer" ON "ProfileSharer"
  FOR INSERT
  WITH CHECK (
    "profileId" = auth.uid() OR
    public.is_admin()
  );

-- Allow profiles to update their own sharer record
CREATE POLICY "Profiles can update own sharer" ON "ProfileSharer"
  FOR UPDATE
  USING (
    "profileId" = auth.uid() OR
    public.is_admin()
  )
  WITH CHECK (
    "profileId" = auth.uid() OR
    public.is_admin()
  );

-- Allow profiles to delete their own sharer record
CREATE POLICY "Profiles can delete own sharer" ON "ProfileSharer"
  FOR DELETE
  USING (
    "profileId" = auth.uid() OR
    public.is_admin()
  );

-- Allow executors to view ProfileSharer records they are associated with
CREATE POLICY "Executors can view sharers they represent" ON "ProfileSharer"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM "ProfileExecutor" pe
      WHERE pe."sharerId" = "ProfileSharer".id
        AND pe."executorId" = auth.uid()
    )
  );

-- ========================================================
-- STEP 5: Create direct RLS policies for ProfileExecutor table
-- ========================================================

-- Allow sharers to manage executors for their sharer record
CREATE POLICY "Sharers can manage executors" ON "ProfileExecutor"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM "ProfileSharer" ps
      WHERE ps.id = "ProfileExecutor"."sharerId"
        AND ps."profileId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "ProfileSharer" ps
      WHERE ps.id = "ProfileExecutor"."sharerId"
        AND ps."profileId" = auth.uid()
    )
  );

-- Allow executors to view their own relationships
CREATE POLICY "Executors can view own relationships" ON "ProfileExecutor"
  FOR SELECT
  USING (
    "executorId" = auth.uid()
  );

-- Allow admins to manage all executor relationships
CREATE POLICY "Admins can manage all executors" ON "ProfileExecutor"
  FOR ALL
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- ========================================================
-- STEP 6: Enable Row Level Security on the tables if needed
-- ========================================================
ALTER TABLE "ProfileSharer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileExecutor" ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- STEP 7: Recreate all dependent policies
-- ========================================================

DO $$
DECLARE
    policy_record RECORD;
    policy_sql TEXT;
BEGIN
    FOR policy_record IN SELECT * FROM dependent_policies LOOP
        -- Build the policy recreation SQL
        policy_sql := 'CREATE POLICY "' || policy_record.policyname || '" ON "' || policy_record.tablename || '"';
        
        -- Add the command type
        CASE policy_record.cmd
            WHEN 'SELECT' THEN policy_sql := policy_sql || E'\n  FOR SELECT';
            WHEN 'INSERT' THEN policy_sql := policy_sql || E'\n  FOR INSERT';
            WHEN 'UPDATE' THEN policy_sql := policy_sql || E'\n  FOR UPDATE';
            WHEN 'DELETE' THEN policy_sql := policy_sql || E'\n  FOR DELETE';
            ELSE policy_sql := policy_sql || E'\n  FOR ALL';
        END CASE;
        
        -- Add the USING clause
        policy_sql := policy_sql || E'\n  USING (' || policy_record.qual || ')';
        
        -- Add the WITH CHECK clause if it exists
        IF policy_record.with_check IS NOT NULL THEN
            policy_sql := policy_sql || E'\n  WITH CHECK (' || policy_record.with_check || ')';
        END IF;
        
        -- Execute the policy creation
        RAISE NOTICE 'Recreating policy: %', policy_record.policyname;
        EXECUTE policy_sql;
    END LOOP;
END $$;

-- ========================================================
-- STEP 8: Create RPC functions for emergency access
-- ========================================================

-- Get executor relationship for a user, bypassing RLS
CREATE OR REPLACE FUNCTION get_executor_for_user(user_id uuid)
RETURNS TABLE (
  id uuid,
  sharerId uuid,
  executorId uuid
)
LANGUAGE sql
SECURITY DEFINER -- Bypass RLS
AS $$
  SELECT id, "sharerId", "executorId"
  FROM "ProfileExecutor"
  WHERE "executorId" = user_id;
$$;

-- Check if a user has admin status, bypassing RLS
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Bypass RLS
AS $$
  SELECT 
    COALESCE(
      (
        SELECT
          CASE
            WHEN raw_app_meta_data->>'role' = 'admin' THEN TRUE
            WHEN raw_app_meta_data->'is_super_admin' = 'true' THEN TRUE
            ELSE FALSE
          END
        FROM auth.users
        WHERE id = user_id
      ),
      FALSE
    )
$$;

-- Check if a user has access to a sharer, bypassing RLS
CREATE OR REPLACE FUNCTION has_sharer_access_check(user_id uuid, sharer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Bypass RLS
AS $$
  -- Check if admin
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE 
      id = user_id AND 
      (
        (raw_app_meta_data->>'role')::text = 'admin' OR 
        COALESCE((raw_app_meta_data->>'is_super_admin')::boolean, false) = true
      )
  )
  
  -- Check if sharer owner
  OR EXISTS (
    SELECT 1
    FROM "ProfileSharer" ps
    WHERE ps.id = sharer_id
      AND ps."profileId" = user_id
  )
  
  -- Check if executor for sharer
  OR EXISTS (
    SELECT 1
    FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = sharer_id
      AND pe."executorId" = user_id
  );
$$;

-- Emergency function to get role information when RLS is causing issues
CREATE OR REPLACE FUNCTION get_user_role_emergency(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
DECLARE
  result jsonb;
  roles_array jsonb;
  sharer_id uuid;
  executor_relationships jsonb;
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
  
  -- Get executor relationships
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'sharerId', "sharerId"
  ))
  INTO executor_relationships
  FROM "ProfileExecutor"
  WHERE "executorId" = user_id;
  
  -- Build the result
  result := jsonb_build_object(
    'roles', COALESCE(roles_array, '[]'::jsonb),
    'sharerId', sharer_id,
    'executorRelationships', COALESCE(executor_relationships, '[]'::jsonb),
    'timestamp', CURRENT_TIMESTAMP
  );
  
  RETURN result;
END;
$$;

-- ========================================================
-- STEP 9: Verify the changes
-- ========================================================

-- Output the number of policies we recreated
SELECT 'Successfully recreated ' || COUNT(*) || ' dependent policies.' AS result FROM dependent_policies;

-- Clean up the temporary table
DROP TABLE dependent_policies; 