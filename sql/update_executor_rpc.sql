-- Update the get_executor_for_user function to provide more complete profile data
-- and ensure it includes createdAt timestamps needed by the UI
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

  -- Directly get executor relationships with full profile data
  SELECT 
    json_agg(json_build_object(
      'id', pe.id, 
      'sharerId', pe."sharerId",
      'executorId', pe."executorId",
      'createdAt', pe."createdAt",
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