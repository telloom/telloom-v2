-- Fix for missing SQL functions and infinite recursion in RLS policies

-- 1. First, drop existing problematic policies that might be causing infinite recursion
DROP POLICY IF EXISTS "ProfileSharer_access_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileExecutor_access_policy" ON "ProfileExecutor";

-- 2. Create the missing emergency role function
CREATE OR REPLACE FUNCTION public.get_user_role_emergency(user_id uuid DEFAULT auth.uid())
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  WITH user_roles AS (
    SELECT array_agg(pr.role) as roles
    FROM "ProfileRole" pr
    WHERE pr."profileId" = user_id
  ),
  sharer_info AS (
    SELECT ps.id as sharer_id
    FROM "ProfileSharer" ps
    WHERE ps."profileId" = user_id
  ),
  executor_info AS (
    SELECT 
      json_agg(json_build_object(
        'id', pe.id,
        'sharerId', pe."sharerId"
      )) as relationships
    FROM "ProfileExecutor" pe
    WHERE pe."executorId" = user_id
  )
  SELECT 
    jsonb_build_object(
      'roles', COALESCE((SELECT roles FROM user_roles), ARRAY[]::text[]),
      'sharerId', (SELECT sharer_id FROM sharer_info),
      'is_sharer', (SELECT sharer_id IS NOT NULL FROM sharer_info),
      'executor_relationships', COALESCE((SELECT relationships FROM executor_info), '[]'::json),
      'has_executor_relationship', (SELECT COUNT(*) > 0 FROM "ProfileExecutor" WHERE "executorId" = user_id),
      'timestamp', now()
    ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to get executor relationships for a user
CREATE OR REPLACE FUNCTION public.get_executor_for_user(user_id uuid DEFAULT auth.uid())
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  WITH sharer_check AS (
    SELECT ps.id as sharer_id 
    FROM "ProfileSharer" ps 
    WHERE ps."profileId" = user_id
  ),
  executor_relationships AS (
    SELECT 
      json_agg(json_build_object(
        'id', pe.id,
        'sharerId', pe."sharerId"
      )) as relationships
    FROM "ProfileExecutor" pe
    WHERE pe."executorId" = user_id
  )
  SELECT 
    jsonb_build_object(
      'is_sharer', (SELECT sharer_id IS NOT NULL FROM sharer_check),
      'relationships', COALESCE((SELECT relationships FROM executor_relationships), '[]'::json),
      'has_executor_relationship', (SELECT COUNT(*) > 0 FROM "ProfileExecutor" WHERE "executorId" = user_id)
    ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to safely check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (
      (raw_app_meta_data->>'role')::text = 'admin' 
      OR COALESCE((raw_app_meta_data->>'is_super_admin')::boolean, false) = true
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to safely get profile data
CREATE OR REPLACE FUNCTION public.get_profile_safe(target_user_id uuid DEFAULT auth.uid())
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', p.id,
      'firstName', p."firstName",
      'lastName', p."lastName",
      'email', p.email,
      'avatarUrl', p."avatarUrl"
    ) INTO result
  FROM "Profile" p
  WHERE p.id = target_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create direct policies for ProfileSharer table to avoid recursion
CREATE POLICY "ProfileSharer_admin_direct_policy" ON "ProfileSharer"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ProfileSharer_owner_direct_policy" ON "ProfileSharer"  
  FOR ALL USING ("profileId" = auth.uid()) WITH CHECK ("profileId" = auth.uid());

CREATE POLICY "ProfileSharer_executor_direct_policy" ON "ProfileSharer"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = "ProfileSharer"."id" AND pe."executorId" = auth.uid()
  ));

-- 7. Create direct policies for ProfileExecutor table to avoid recursion
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

-- 8. Create a combined access check function to use in other table policies
CREATE OR REPLACE FUNCTION public.has_sharer_access(sharer_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN 
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM "ProfileSharer" ps
      WHERE ps.id = sharer_id AND ps."profileId" = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM "ProfileExecutor" pe
      WHERE pe."sharerId" = sharer_id AND pe."executorId" = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 