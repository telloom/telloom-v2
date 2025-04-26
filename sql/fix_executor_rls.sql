-- First, drop existing policies on ProfileSharer and ProfileExecutor
DROP POLICY IF EXISTS "ProfileSharer update policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer delete policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer insert policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer select policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_admin_direct_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_owner_direct_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_executor_direct_policy" ON "ProfileSharer";

DROP POLICY IF EXISTS "ProfileExecutor update policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor delete policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor insert policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor select policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_admin_direct_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_owner_direct_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_sharer_direct_policy" ON "ProfileExecutor";

-- Create or replace the base helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND ((raw_app_meta_data->>'role')::text = 'admin' 
         OR COALESCE((raw_app_meta_data->>'is_super_admin')::boolean, false) = true)
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_sharer_owner(sharer_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = sharer_id AND ps."profileId" = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_executor_for_sharer(sharer_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = sharer_id AND pe."executorId" = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create the main access function that combines all checks
CREATE OR REPLACE FUNCTION public.has_sharer_access(sharer_id uuid)
RETURNS boolean AS $$
  SELECT 
    public.is_admin() OR 
    public.is_sharer_owner(sharer_id) OR 
    public.is_executor_for_sharer(sharer_id);
$$ LANGUAGE sql SECURITY DEFINER;

-- Create direct policies for ProfileSharer to avoid infinite recursion
CREATE POLICY "ProfileSharer_admin_direct_policy" ON "ProfileSharer"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ProfileSharer_owner_direct_policy" ON "ProfileSharer"  
  FOR ALL USING ("profileId" = auth.uid()) WITH CHECK ("profileId" = auth.uid());

CREATE POLICY "ProfileSharer_executor_direct_policy" ON "ProfileSharer"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = "ProfileSharer"."id" AND pe."executorId" = auth.uid()
  ));

-- Create direct policies for ProfileExecutor to avoid infinite recursion
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

-- Drop the existing function first to avoid parameter default issues
DROP FUNCTION IF EXISTS public.get_executor_for_user(uuid);

-- Create the get_executor_for_user RPC function that avoids using RLS
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