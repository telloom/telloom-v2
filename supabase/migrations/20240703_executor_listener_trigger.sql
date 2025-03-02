-- Migration: Add trigger to automatically create ProfileListener records for executors
-- Created: July 3, 2024

-- Create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION create_listener_for_executor()
RETURNS TRIGGER AS $$
DECLARE
  v_listener_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Check if a ProfileListener relationship already exists
  SELECT id INTO v_listener_id
  FROM "ProfileListener"
  WHERE "listenerId" = NEW."executorId"
  AND "sharerId" = NEW."sharerId";
  
  -- If relationship doesn't exist, create it
  IF v_listener_id IS NULL THEN
    -- First try to use the RPC function if it exists
    BEGIN
      SELECT create_profile_listener(
        NEW."executorId",
        NEW."sharerId",
        v_now,
        TRUE
      ) INTO v_listener_id;
      
      RAISE LOG 'Created listener relationship for executor via RPC: %', v_listener_id;
    EXCEPTION
      WHEN OTHERS THEN
        -- If RPC fails, insert directly
        INSERT INTO "ProfileListener" (
          "listenerId",
          "sharerId",
          "sharedSince",
          "hasAccess",
          "notifications",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          NEW."executorId",
          NEW."sharerId",
          v_now,
          TRUE,
          TRUE,
          v_now,
          v_now
        )
        RETURNING id INTO v_listener_id;
        
        RAISE LOG 'Created listener relationship for executor via direct insert: %', v_listener_id;
    END;
  ELSE
    RAISE LOG 'Listener relationship already exists for executor: %', v_listener_id;
  END IF;
  
  -- Also ensure the user has the LISTENER role
  PERFORM id FROM "ProfileRole" WHERE "profileId" = NEW."executorId" AND "role" = 'LISTENER';
  
  IF NOT FOUND THEN
    INSERT INTO "ProfileRole" ("profileId", "role", "createdAt", "updatedAt")
    VALUES (NEW."executorId", 'LISTENER', v_now, v_now);
    
    RAISE LOG 'Added LISTENER role for executor: %', NEW."executorId";
  END IF;
  
  -- Also ensure the user has the EXECUTOR role
  PERFORM id FROM "ProfileRole" WHERE "profileId" = NEW."executorId" AND "role" = 'EXECUTOR';
  
  IF NOT FOUND THEN
    INSERT INTO "ProfileRole" ("profileId", "role", "createdAt", "updatedAt")
    VALUES (NEW."executorId", 'EXECUTOR', v_now, v_now);
    
    RAISE LOG 'Added EXECUTOR role for executor: %', NEW."executorId";
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_listener_for_executor trigger: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW; -- Continue with the insert even if the trigger fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS executor_listener_trigger ON "ProfileExecutor";

CREATE TRIGGER executor_listener_trigger
AFTER INSERT ON "ProfileExecutor"
FOR EACH ROW
EXECUTE FUNCTION create_listener_for_executor();

-- Log completion
DO $$
BEGIN
  RAISE LOG 'Added trigger to automatically create ProfileListener records for executors';
END $$; 