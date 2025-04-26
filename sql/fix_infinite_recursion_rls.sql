-- SQL script to fix the infinite recursion in RLS policies
-- This script implements the approach described in role-access-explanation.md

-- 1. First create the base-level helper functions
-- These functions directly check specific access patterns without relying on other tables with RLS

-- Function to check if user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND ((raw_app_meta_data->>'role')::text = 'admin' 
         OR COALESCE((raw_app_meta_data->>'is_super_admin')::boolean, false) = true)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user owns a ProfileSharer record
CREATE OR REPLACE FUNCTION public.is_sharer_owner(sharer_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = sharer_id AND ps."profileId" = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is an executor for a sharer
CREATE OR REPLACE FUNCTION public.is_executor_for_sharer(sharer_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = sharer_id AND pe."executorId" = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Create the composite access function that combines the base functions
CREATE OR REPLACE FUNCTION public.has_sharer_access(sharer_id uuid)
RETURNS boolean AS $$
  SELECT 
    public.is_admin() OR 
    public.is_sharer_owner(sharer_id) OR 
    public.is_executor_for_sharer(sharer_id);
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Special policy handling for base tables
-- For ProfileSharer and ProfileExecutor, use direct checks to avoid recursion

-- Drop existing policies for ProfileSharer to reset them
DROP POLICY IF EXISTS "ProfileSharer:all" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_admin_direct_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_owner_direct_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_executor_direct_policy" ON "ProfileSharer";

-- Create direct policies for ProfileSharer
CREATE POLICY "ProfileSharer_admin_direct_policy" ON "ProfileSharer"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ProfileSharer_owner_direct_policy" ON "ProfileSharer"  
  FOR ALL USING ("profileId" = auth.uid()) WITH CHECK ("profileId" = auth.uid());

CREATE POLICY "ProfileSharer_executor_direct_policy" ON "ProfileSharer"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = "ProfileSharer"."id" AND pe."executorId" = auth.uid()
  ));

-- Drop existing policies for ProfileExecutor to reset them
DROP POLICY IF EXISTS "ProfileExecutor:all" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_admin_direct_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_owner_direct_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_sharer_direct_policy" ON "ProfileExecutor";

-- Create direct policies for ProfileExecutor
CREATE POLICY "ProfileExecutor_admin_direct_policy" ON "ProfileExecutor"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ProfileExecutor_owner_direct_policy" ON "ProfileExecutor"
  FOR ALL USING ("executorId" = auth.uid()) WITH CHECK ("executorId" = auth.uid());

CREATE POLICY "ProfileExecutor_sharer_direct_policy" ON "ProfileExecutor"
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "ProfileExecutor"."sharerId" AND ps."profileId" = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "ProfileExecutor"."sharerId" AND ps."profileId" = auth.uid()
  ));

-- 4. Create RPC function to bypass RLS for complex queries
-- This function gets all executor relationships for a user

DROP FUNCTION IF EXISTS public.get_executor_for_user(uuid);

CREATE OR REPLACE FUNCTION public.get_executor_for_user(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_executor_relationship', COUNT(pe.id) > 0,
    'executor_relationships', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pe.id,
          'sharerId', pe."sharerId",
          'executorId', pe."executorId",
          'createdAt', pe."createdAt",
          'sharer', jsonb_build_object(
            'id', ps.id,
            'profileId', ps."profileId",
            'profile', jsonb_build_object(
              'id', p.id,
              'firstName', p."firstName",
              'lastName', p."lastName",
              'email', p.email,
              'avatarUrl', p."avatarUrl",
              'createdAt', p."createdAt"
            )
          )
        )
      ) FILTER (WHERE pe.id IS NOT NULL), 
      '[]'::jsonb
    )
  )
  INTO result
  FROM "ProfileExecutor" pe
  JOIN "ProfileSharer" ps ON pe."sharerId" = ps.id
  JOIN "Profile" p ON ps."profileId" = p.id
  WHERE pe."executorId" = user_id;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_executor_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_executor_for_user(uuid) TO service_role;

-- Make sure Row Level Security is enabled on these tables
ALTER TABLE "ProfileSharer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileExecutor" ENABLE ROW LEVEL SECURITY;

-- Log completion message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies fixed to prevent infinite recursion';
END
$$; 