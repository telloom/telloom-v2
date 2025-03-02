-- Fix permissions for the ProfileListener table
-- Migration created: July 2, 2024

DO $$
BEGIN
  -- Check if the ProfileListener table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ProfileListener'
  ) THEN
    -- Grant permissions to the authenticated role
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON "ProfileListener" TO authenticated';
    RAISE LOG 'Granted SELECT, INSERT, UPDATE, DELETE permissions on ProfileListener to authenticated role';
    
    -- Grant permissions to the service_role
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON "ProfileListener" TO service_role';
    RAISE LOG 'Granted SELECT, INSERT, UPDATE, DELETE permissions on ProfileListener to service_role role';
    
    -- Grant permissions to the anon role (for unauthenticated operations if needed)
    EXECUTE 'GRANT SELECT ON "ProfileListener" TO anon';
    RAISE LOG 'Granted SELECT permissions on ProfileListener to anon role';
  ELSE
    RAISE LOG 'Table ProfileListener does not exist, skipping';
  END IF;
  
  RAISE LOG 'Migration completed: Fixed permissions for ProfileListener table';
END $$; 