-- Update existing notifications with role data
DO $$ 
BEGIN
  -- Update Follow Request notifications
  UPDATE "Notification"
  SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{role}',
    '"SHARER"'
  )
  WHERE type = 'FOLLOW_REQUEST'
  AND (data->>'role') IS NULL;

  -- Update Invitation notifications for executors
  UPDATE "Notification"
  SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{role}',
    '"EXECUTOR"'
  )
  WHERE type = 'INVITATION'
  AND (data->>'role') = 'EXECUTOR'
  AND (data->>'role') IS NULL;

  -- Update Invitation notifications for listeners
  UPDATE "Notification"
  SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{role}',
    '"LISTENER"'
  )
  WHERE type = 'INVITATION'
  AND (data->>'role') = 'LISTENER'
  AND (data->>'role') IS NULL;

  -- Update Connection Change notifications for executors
  UPDATE "Notification"
  SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{role}',
    '"EXECUTOR"'
  )
  WHERE type = 'CONNECTION_CHANGE'
  AND data->>'executorId' IS NOT NULL
  AND (data->>'role') IS NULL;

  -- Update Connection Change notifications for listeners
  UPDATE "Notification"
  SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{role}',
    '"LISTENER"'
  )
  WHERE type = 'CONNECTION_CHANGE'
  AND data->>'listenerId' IS NOT NULL
  AND (data->>'role') IS NULL;

  -- Update remaining Connection Change notifications as SHARER
  UPDATE "Notification"
  SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{role}',
    '"SHARER"'
  )
  WHERE type = 'CONNECTION_CHANGE'
  AND (data->>'role') IS NULL;

  -- Update Topic Response notifications
  UPDATE "Notification"
  SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{role}',
    '"SHARER"'
  )
  WHERE type = 'TOPIC_RESPONSE'
  AND (data->>'role') IS NULL;

  -- Update Topic Comment notifications
  UPDATE "Notification"
  SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{role}',
    '"SHARER"'
  )
  WHERE type = 'TOPIC_COMMENT'
  AND (data->>'role') IS NULL;
END $$; 