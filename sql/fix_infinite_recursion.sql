-- Create exec_sql function if it doesn't exist
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix for infinite recursion in RLS policies for ProfileSharer and ProfileExecutor tables

-- 1. First, drop existing policies that might be causing infinite recursion
DROP POLICY IF EXISTS "ProfileSharer_access_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_admin_direct_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_owner_direct_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_executor_direct_policy" ON "ProfileSharer";

DROP POLICY IF EXISTS "ProfileExecutor_access_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_admin_direct_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_owner_direct_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_sharer_direct_policy" ON "ProfileExecutor";

-- Also drop the simple policies we're about to create, if they exist already
DROP POLICY IF EXISTS "ProfileSharer_admin_simple_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_owner_simple_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileSharer_executor_simple_policy" ON "ProfileSharer";
DROP POLICY IF EXISTS "ProfileExecutor_admin_simple_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_owner_simple_policy" ON "ProfileExecutor";
DROP POLICY IF EXISTS "ProfileExecutor_sharer_simple_policy" ON "ProfileExecutor";

-- 2. Temporarily disable RLS on the tables to avoid any recursion during setup
ALTER TABLE "ProfileSharer" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileExecutor" DISABLE ROW LEVEL SECURITY;

-- 3. Create a simple is_admin function that doesn't call other tables
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

-- 4. Re-enable RLS on the tables
ALTER TABLE "ProfileSharer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileExecutor" ENABLE ROW LEVEL SECURITY;

-- 5. Create simple direct policies for ProfileSharer table
CREATE POLICY "ProfileSharer_admin_simple_policy" ON "ProfileSharer"
  FOR ALL USING (public.is_admin_simple()) WITH CHECK (public.is_admin_simple());

CREATE POLICY "ProfileSharer_owner_simple_policy" ON "ProfileSharer"  
  FOR ALL USING ("profileId" = auth.uid()) WITH CHECK ("profileId" = auth.uid());

-- This is a simplified policy that doesn't cause recursion because it's only for SELECT
CREATE POLICY "ProfileSharer_executor_simple_policy" ON "ProfileSharer"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = "ProfileSharer"."id" AND pe."executorId" = auth.uid()
  ));

-- 6. Create simple direct policies for ProfileExecutor table
CREATE POLICY "ProfileExecutor_admin_simple_policy" ON "ProfileExecutor"
  FOR ALL USING (public.is_admin_simple()) WITH CHECK (public.is_admin_simple());

CREATE POLICY "ProfileExecutor_owner_simple_policy" ON "ProfileExecutor"
  FOR ALL USING ("executorId" = auth.uid()) WITH CHECK ("executorId" = auth.uid());

-- This is a simplified policy that doesn't cause recursion
CREATE POLICY "ProfileExecutor_sharer_simple_policy" ON "ProfileExecutor"
  FOR ALL 
  USING ("sharerId" IN (
    SELECT id FROM "ProfileSharer" WHERE "profileId" = auth.uid()
  ))
  WITH CHECK ("sharerId" IN (
    SELECT id FROM "ProfileSharer" WHERE "profileId" = auth.uid()
  ));

-- 7. Update the get_user_role_emergency function to be simpler and avoid recursion
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

-- 8. Create the get_executor_for_user function if it doesn't exist
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
            JOIN "Profile" p ON ps."profileId" = p.id
            WHERE p.id = user_id),
    (SELECT ps.id FROM "ProfileSharer" ps
     JOIN "Profile" p ON ps."profileId" = p.id
     WHERE p.id = user_id
     LIMIT 1)
  INTO is_sharer, sharer_id;

  -- Check if user has executor relationships
  SELECT 
    EXISTS (SELECT 1 FROM "ProfileExecutor" pe
            JOIN "Profile" p ON pe."executorId" = p.id
            WHERE p.id = user_id)
  INTO has_executor;

  -- Directly get executor relationships
  SELECT 
    json_agg(json_build_object(
      'id', pe.id, 
      'sharerId', pe."sharerId",
      'executorId', pe."executorId",
      'sharer', json_build_object(
        'id', ps.id,
        'profileId', ps."profileId",
        'profile', json_build_object(
          'firstName', p."firstName",
          'lastName', p."lastName",
          'avatarUrl', p."avatarUrl"
        )
      )
    ))
  FROM "ProfileExecutor" pe
  JOIN "ProfileSharer" ps ON ps.id = pe."sharerId"
  JOIN "Profile" p ON p.id = ps."profileId"
  JOIN "Profile" executor_profile ON executor_profile.id = pe."executorId"
  WHERE executor_profile.id = user_id
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

-- 9. Ensure the get_profile_safe function has the parameter name that matches the client
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

-- First, check if policies exist and drop them if they do
DO $$ 
BEGIN
    -- Drop ProfileSharer policies if they exist
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ProfileSharer' AND policyname = 'ProfileSharer users can view their own records'
    ) THEN
        DROP POLICY "ProfileSharer users can view their own records" ON "ProfileSharer";
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ProfileSharer' AND policyname = 'Executors can view sharer records'
    ) THEN
        DROP POLICY "Executors can view sharer records" ON "ProfileSharer";
    END IF;

    -- Drop ProfileExecutor policies if they exist
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ProfileExecutor' AND policyname = 'ProfileExecutor users can view their executor relationships'
    ) THEN
        DROP POLICY "ProfileExecutor users can view their executor relationships" ON "ProfileExecutor";
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ProfileExecutor' AND policyname = 'Sharers can view their executor relationships'
    ) THEN
        DROP POLICY "Sharers can view their executor relationships" ON "ProfileExecutor";
    END IF;
END
$$;

-- Create a direct function to check if user is associated with a sharer (without recursion)
CREATE OR REPLACE FUNCTION public.check_direct_sharer_access(sharer_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Simple direct check if the current user is the sharer (by profileId)
    RETURN EXISTS (
        SELECT 1 FROM "ProfileSharer" ps
        JOIN "Profile" p ON ps."profileId" = p.id
        WHERE ps.id = sharer_id AND p.id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a direct function to check if user is an executor for a sharer (without recursion)
CREATE OR REPLACE FUNCTION public.check_direct_executor_access(sharer_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Simple direct check if the current user is an executor for the sharer
    RETURN EXISTS (
        SELECT 1 FROM "ProfileExecutor" pe
        JOIN "Profile" p ON pe."executorId" = p.id
        WHERE pe."sharerId" = sharer_id AND p.id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix ProfileSharer RLS
ALTER TABLE "ProfileSharer" ENABLE ROW LEVEL SECURITY;

-- Add simplified RLS policies
CREATE POLICY "ProfileSharer users can view their own records"
ON "ProfileSharer"
FOR ALL
USING (
    public.is_admin() OR
    check_direct_sharer_access(id)
);

CREATE POLICY "Executors can view sharer records"
ON "ProfileSharer"
FOR SELECT
USING (
    check_direct_executor_access(id)
);

-- Fix ProfileExecutor RLS
ALTER TABLE "ProfileExecutor" ENABLE ROW LEVEL SECURITY;

-- Add simplified RLS policies
CREATE POLICY "ProfileExecutor users can view their executor relationships"
ON "ProfileExecutor"
FOR ALL
USING (
    public.is_admin() OR
    EXISTS (
        SELECT 1 FROM "Profile" p
        WHERE p.id = "executorId" AND p.id = auth.uid()
    )
);

CREATE POLICY "Sharers can view their executor relationships"
ON "ProfileExecutor"
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM "ProfileSharer" ps
        JOIN "Profile" p ON ps."profileId" = p.id
        WHERE ps.id = "sharerId" AND p.id = auth.uid()
    )
);

-- Create the get_profile_safe function if it doesn't exist
DROP FUNCTION IF EXISTS public.get_profile_safe(user_id uuid);
CREATE OR REPLACE FUNCTION public.get_profile_safe(user_id uuid)
RETURNS SETOF "Profile" AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM "Profile"
    WHERE id = user_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the get_user_role_emergency function
DROP FUNCTION IF EXISTS public.get_user_role_emergency(user_id uuid);
CREATE OR REPLACE FUNCTION public.get_user_role_emergency(user_id uuid)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'roles', ARRAY[]::text[],
        'sharerId', NULL::uuid,
        'is_sharer', EXISTS (
            SELECT 1 FROM "ProfileSharer" ps
            JOIN "Profile" p ON ps."profileId" = p.id
            WHERE p.id = user_id
        ),
        'has_executor_relationship', EXISTS (
            SELECT 1 FROM "ProfileExecutor" pe
            JOIN "Profile" p ON pe."executorId" = p.id
            WHERE p.id = user_id
        ),
        'timestamp', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 