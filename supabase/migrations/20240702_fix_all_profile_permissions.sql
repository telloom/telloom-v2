-- Fix permissions for all profile-related tables
-- Migration created: July 2, 2024

-- Function to grant permissions to a table
CREATE OR REPLACE FUNCTION grant_permissions_to_table(p_table_name text) RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
  ) THEN
    -- Grant permissions to the authenticated role
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON "%s" TO authenticated', p_table_name);
    RAISE LOG 'Granted SELECT, INSERT, UPDATE, DELETE permissions on %s to authenticated role', p_table_name;
    
    -- Grant permissions to the service_role
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON "%s" TO service_role', p_table_name);
    RAISE LOG 'Granted SELECT, INSERT, UPDATE, DELETE permissions on %s to service_role role', p_table_name;
    
    -- Grant permissions to the anon role (for unauthenticated operations if needed)
    EXECUTE format('GRANT SELECT ON "%s" TO anon', p_table_name);
    RAISE LOG 'Granted SELECT permissions on %s to anon role', p_table_name;
  ELSE
    RAISE LOG 'Table %s does not exist, skipping', p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply permissions to all profile-related tables
DO $$
BEGIN
  PERFORM grant_permissions_to_table('Profile');
  PERFORM grant_permissions_to_table('ProfileRole');
  PERFORM grant_permissions_to_table('ProfileSharer');
  PERFORM grant_permissions_to_table('ProfileListener');
  PERFORM grant_permissions_to_table('ProfileExecutor');
  PERFORM grant_permissions_to_table('Invitation');
END $$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS grant_permissions_to_table(text);

-- Log completion
DO $$
BEGIN
  RAISE LOG 'Migration completed: Fixed permissions for all profile-related tables';
END $$; 