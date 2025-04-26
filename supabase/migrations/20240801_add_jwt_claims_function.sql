-- Migration: Add function to inject role information into JWT tokens
-- Created: August 1, 2024

-- Drop function if it already exists (for rerunning migration)
DROP FUNCTION IF EXISTS auth.extend_jwt_claims(jsonb);

-- Create the function to extend JWT claims with role information
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

  -- Limit total JWT size by not including full relationships in token
  -- If it's needed, it can be fetched separately

  -- Add user_metadata to JWT claims
  RETURN jsonb_set(
    jwt,
    '{app_metadata}',
    user_metadata
  );
END;
$$;

-- Setup hook to call the function after login
DROP FUNCTION IF EXISTS auth.on_auth_successful_login();

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

-- Enable the hook by setting configuration
COMMENT ON FUNCTION auth.on_auth_successful_login IS 'Trigger: Add role information to JWT token after successful login';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auth.extend_jwt_claims TO authenticated;
GRANT EXECUTE ON FUNCTION auth.on_auth_successful_login TO authenticated; 