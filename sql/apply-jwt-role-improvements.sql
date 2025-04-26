-- Apply JWT Role Improvements
-- This script combines all the SQL changes needed to implement JWT role claims

-- 1. Drop existing functions to avoid errors
DROP FUNCTION IF EXISTS auth.extend_jwt_claims(jsonb);
DROP FUNCTION IF EXISTS auth.on_auth_successful_login();
DROP FUNCTION IF EXISTS public.is_sharer_from_jwt();
DROP FUNCTION IF EXISTS public.has_executor_role_from_jwt();
DROP FUNCTION IF EXISTS public.get_roles_from_jwt();
DROP FUNCTION IF EXISTS public.has_role_from_jwt(text);
DROP FUNCTION IF EXISTS public.get_sharer_id_from_jwt();

-- 2. Create the function to extend JWT claims with role information
CREATE OR REPLACE FUNCTION auth.extend_jwt_claims(jwt jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  roles_array text[];
  is_sharer boolean := false;
  sharer_id uuid := null;
  has_executor boolean := false;
  executor_relationships jsonb := '[]'::jsonb;
  user_metadata jsonb := '{}';
BEGIN
  -- Extract the user ID from JWT
  user_id := (jwt->>'sub')::uuid;

  -- Skip if no user ID (should never happen)
  IF user_id IS NULL THEN
    RETURN jwt;
  END IF;

  -- Get user roles
  SELECT ARRAY_AGG(role::TEXT) INTO roles_array
  FROM "ProfileRole"
  WHERE "profileId" = user_id;

  -- Get sharer info
  SELECT
    EXISTS(SELECT 1 FROM "ProfileRole" WHERE "profileId" = user_id AND role = 'SHARER'),
    ps.id
  INTO
    is_sharer,
    sharer_id
  FROM "ProfileRole" pr
  LEFT JOIN "ProfileSharer" ps ON ps."profileId" = user_id
  WHERE pr."profileId" = user_id AND pr.role = 'SHARER'
  LIMIT 1;

  -- Get executor info
  SELECT 
    EXISTS(SELECT 1 FROM "ProfileExecutor" WHERE "executorId" = user_id),
    COALESCE(json_agg(jsonb_build_object(
      'id', pe.id,
      'sharerId', pe."sharerId"
    )) FILTER (WHERE pe.id IS NOT NULL), '[]'::jsonb)
  INTO
    has_executor,
    executor_relationships
  FROM "ProfileExecutor" pe
  WHERE pe."executorId" = user_id;

  -- Build app_metadata object with role information
  user_metadata := jsonb_build_object(
    'roles', COALESCE(roles_array, ARRAY[]::TEXT[]),
    'is_sharer', is_sharer,
    'sharer_id', sharer_id,
    'has_executor', has_executor,
    'executor_count', jsonb_array_length(executor_relationships)
  );

  -- Add user_metadata to JWT claims
  RETURN jsonb_set(
    jwt,
    '{app_metadata}',
    user_metadata
  );
END;
$$;

-- 3. Setup hook to call the function after login
CREATE OR REPLACE FUNCTION auth.on_auth_successful_login()
RETURNS jsonb
SECURITY DEFINER 
SET search_path = auth, public
LANGUAGE plpgsql AS $$
DECLARE
  jwt_claim jsonb;
BEGIN
  -- Get base claim data
  jwt_claim := jsonb_build_object(
    'sub', auth.uid(),
    'iat', floor(extract(epoch FROM CURRENT_TIMESTAMP)),
    'exp', floor(extract(epoch FROM CURRENT_TIMESTAMP + interval '1 hour'))
  );

  -- Extend claims with role information
  jwt_claim := auth.extend_jwt_claims(jwt_claim);

  RETURN jwt_claim;
END;
$$;

-- 4. Create JWT claims helper functions for RLS policies
-- Function to check if user is a sharer from JWT claims
CREATE OR REPLACE FUNCTION public.is_sharer_from_jwt()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'is_sharer', 'false')::boolean;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to check if user has executor role from JWT claims
CREATE OR REPLACE FUNCTION public.has_executor_role_from_jwt()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'has_executor', 'false')::boolean;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to get user's roles from JWT claims
CREATE OR REPLACE FUNCTION public.get_roles_from_jwt()
RETURNS text[] AS $$
BEGIN
  RETURN COALESCE((auth.jwt()->>'app_metadata')::jsonb->'roles', '[]'::jsonb)::text[];
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to check if user has specific role from JWT
CREATE OR REPLACE FUNCTION public.has_role_from_jwt(role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN role_name = ANY(public.get_roles_from_jwt());
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to get sharer ID from JWT claims
CREATE OR REPLACE FUNCTION public.get_sharer_id_from_jwt()
RETURNS uuid AS $$
DECLARE
  sharer_id text;
BEGIN
  sharer_id := (auth.jwt()->>'app_metadata')::jsonb->>'sharer_id';
  IF sharer_id IS NULL OR sharer_id = 'null' THEN
    RETURN NULL;
  END IF;
  RETURN sharer_id::uuid;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 5. Test the JWT claims function with a sample user
DO $$
DECLARE
  test_user_id uuid;
  test_jwt jsonb;
  result jsonb;
BEGIN
  -- Get a random user to test with
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  -- Build a test JWT
  test_jwt := jsonb_build_object(
    'sub', test_user_id,
    'iat', floor(extract(epoch FROM CURRENT_TIMESTAMP)),
    'exp', floor(extract(epoch FROM CURRENT_TIMESTAMP + interval '1 hour'))
  );
  
  -- Extend the JWT with role claims
  result := auth.extend_jwt_claims(test_jwt);
  
  -- Log the results
  RAISE NOTICE 'Extended JWT for user %: %', test_user_id, result;
END;
$$;

-- 6. Enable the hook by setting configuration
COMMENT ON FUNCTION auth.on_auth_successful_login IS 'Trigger: Add role information to JWT token after successful login';

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION auth.extend_jwt_claims TO authenticated;
GRANT EXECUTE ON FUNCTION auth.on_auth_successful_login TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sharer_from_jwt TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_executor_role_from_jwt TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_roles_from_jwt TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_from_jwt TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sharer_id_from_jwt TO authenticated;

-- 8. Update key policies for performance and to use JWT claims

-- Update Video table policies if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Video') THEN
    EXECUTE 'DROP POLICY IF EXISTS "content_access_policy" ON "Video"';
    EXECUTE '
    CREATE POLICY "content_access_policy" ON "Video"
      FOR ALL 
      USING (
        (
          (public.is_sharer_from_jwt() AND "profileSharerId" = public.get_sharer_id_from_jwt())
          OR
          public.is_admin()
        )
        OR
        public.is_executor_for_sharer("profileSharerId")
      )
      WITH CHECK (
        (
          (public.is_sharer_from_jwt() AND "profileSharerId" = public.get_sharer_id_from_jwt())
          OR
          public.is_admin()
        )
        OR
        public.is_executor_for_sharer("profileSharerId")
      )';
  END IF;
END$$;

-- Update PromptResponse table policies if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PromptResponse') THEN
    EXECUTE 'DROP POLICY IF EXISTS "content_access_policy" ON "PromptResponse"';
    EXECUTE '
    CREATE POLICY "content_access_policy" ON "PromptResponse"
      FOR ALL 
      USING (
        (
          (public.is_sharer_from_jwt() AND "profileSharerId" = public.get_sharer_id_from_jwt())
          OR
          public.is_admin()
        )
        OR
        public.is_executor_for_sharer("profileSharerId")
      )
      WITH CHECK (
        (
          (public.is_sharer_from_jwt() AND "profileSharerId" = public.get_sharer_id_from_jwt())
          OR
          public.is_admin()
        )
        OR
        public.is_executor_for_sharer("profileSharerId")
      )';
  END IF;
END$$;

-- Update PromptCategory table policies if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PromptCategory') THEN
    EXECUTE 'DROP POLICY IF EXISTS "content_access_policy" ON "PromptCategory"';
    EXECUTE '
    CREATE POLICY "content_access_policy" ON "PromptCategory"
      FOR ALL 
      USING (
        -- All authenticated users can access prompt categories
        -- as they are shared resource not specific to any user
        auth.role() = ''authenticated''
      )
      WITH CHECK (
        -- Only admins can modify prompt categories
        public.is_admin()
      )';
  END IF;
END$$;

-- 9. Test one of the JWT functions with a simple query
-- This helps verify that the JWT functions are accessible
DO $$
BEGIN
  RAISE NOTICE 'JWT contains sharer role: %', has_role_from_jwt('SHARER');
  RAISE NOTICE 'JWT indicates user is sharer: %', is_sharer_from_jwt();
  RAISE NOTICE 'JWT contains roles: %', get_roles_from_jwt();
END;
$$; 