-- Update create_profile_executor RPC function to handle the new constraint model
-- Migration created: July 2, 2024

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS create_profile_executor(uuid, uuid);

-- Create the updated function
CREATE OR REPLACE FUNCTION create_profile_executor(
  p_executor_id uuid,
  p_sharer_id uuid
) RETURNS uuid AS $$
DECLARE
  v_executor_id uuid;
BEGIN
  -- Check if the relationship already exists
  SELECT "executorId" INTO v_executor_id
  FROM "ProfileExecutor"
  WHERE "executorId" = p_executor_id AND "sharerId" = p_sharer_id;
  
  -- If relationship exists, return the existing executor ID
  IF v_executor_id IS NOT NULL THEN
    RAISE LOG 'Executor relationship already exists for executor % and sharer %', p_executor_id, p_sharer_id;
    RETURN v_executor_id;
  END IF;
  
  -- Create the new relationship
  INSERT INTO "ProfileExecutor" ("executorId", "sharerId", "createdAt", "updatedAt")
  VALUES (p_executor_id, p_sharer_id, NOW(), NOW())
  RETURNING "executorId" INTO v_executor_id;
  
  RAISE LOG 'Created new executor relationship for executor % and sharer %', p_executor_id, p_sharer_id;
  RETURN v_executor_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating executor relationship: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Log completion
DO $$
BEGIN
  RAISE LOG 'Updated create_profile_executor function to handle multiple executors per sharer';
END $$; 