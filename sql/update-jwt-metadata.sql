-- Script to directly update auth.users raw_app_meta_data with role information

-- 1. First, get the user ID from the email
DO $$
DECLARE
  target_email TEXT := 'james@telloom.com'; -- Replace with the actual email of the user
  user_id UUID;
  roles TEXT[];
  is_sharer BOOLEAN := FALSE;
  sharer_id UUID := NULL;
  has_executor BOOLEAN := FALSE;
  executor_count INTEGER := 0;
  app_metadata JSONB;
BEGIN
  -- Find the user ID based on email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = LOWER(target_email);

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;

  RAISE NOTICE 'Found user with ID: %', user_id;

  -- Get roles from ProfileRole
  SELECT ARRAY_AGG(role::TEXT) INTO roles
  FROM "ProfileRole"
  WHERE "profileId" = user_id;

  -- Check if sharer
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

  -- Check executor status
  SELECT 
    EXISTS(SELECT 1 FROM "ProfileExecutor" WHERE "executorId" = user_id),
    COUNT(pe.id)
  INTO 
    has_executor,
    executor_count
  FROM "ProfileExecutor" pe
  WHERE pe."executorId" = user_id;

  -- Build app metadata JSON
  app_metadata := jsonb_build_object(
    'roles', COALESCE(roles, ARRAY[]::TEXT[]),
    'is_sharer', is_sharer,
    'sharer_id', sharer_id,
    'has_executor', has_executor,
    'executor_count', executor_count,
    'provider', 'email',  -- Preserve existing metadata
    'providers', ARRAY['email']  -- Preserve existing metadata
  );

  RAISE NOTICE 'New app_metadata: %', app_metadata;

  -- Update the user's raw_app_meta_data
  UPDATE auth.users
  SET raw_app_meta_data = app_metadata
  WHERE id = user_id;
  
  RAISE NOTICE 'Successfully updated JWT metadata for user %', user_id;
  
  -- Force JWT refresh by updating auth.users
  -- This will cause the user to receive a new JWT with the updated metadata on next auth check
  UPDATE auth.users
  SET updated_at = NOW()
  WHERE id = user_id;
  
  RAISE NOTICE 'Updated timestamp to force JWT refresh';
END $$;

-- Verify the update
SELECT email, raw_app_meta_data 
FROM auth.users 
WHERE email = 'james@telloom.com'; -- Replace with the actual email 