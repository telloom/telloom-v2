-- Fix permissions for ProfileListener and ProfileExecutor tables
-- This migration grants the necessary permissions to authenticated users and service_role

-- Grant permissions for ProfileListener table
GRANT SELECT, INSERT, UPDATE ON "ProfileListener" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ProfileListener" TO service_role;

-- Grant permissions for ProfileExecutor table
GRANT SELECT, INSERT, UPDATE ON "ProfileExecutor" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ProfileExecutor" TO service_role;

-- Grant permissions for ProfileRole table
GRANT SELECT, INSERT, UPDATE ON "ProfileRole" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ProfileRole" TO service_role;

-- Grant permissions for Profile table
GRANT SELECT, INSERT, UPDATE ON "Profile" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Profile" TO service_role;

-- Grant permissions for Invitation table
GRANT SELECT, UPDATE ON "Invitation" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Invitation" TO service_role;

-- Log the migration
DO $$
BEGIN
  RAISE LOG 'Applied permissions fix for ProfileListener, ProfileExecutor, ProfileRole, Profile, and Invitation tables';
END $$; 