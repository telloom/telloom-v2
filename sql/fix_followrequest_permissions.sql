-- fix_followrequest_permissions.sql
-- This script fixes permissions for the FollowRequest table for the service role
-- Based on our findings, we know the table is named "FollowRequest" with PascalCase

-- Grant full privileges to service_role (used by admin client)
GRANT ALL PRIVILEGES ON TABLE public."FollowRequest" TO service_role;

-- Create a policy specifically for the service_role to bypass RLS
-- First, check if the policy already exists
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'FollowRequest' 
        AND policyname = 'Enable all for service role'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        EXECUTE $policy$
        CREATE POLICY "Enable all for service role" ON public."FollowRequest"
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
        $policy$;
        
        RAISE NOTICE 'Created bypass policy for service_role on FollowRequest table';
    ELSE
        RAISE NOTICE 'Service role policy already exists on FollowRequest table';
    END IF;
END;
$$;

-- Ensure RLS is enabled
ALTER TABLE public."FollowRequest" ENABLE ROW LEVEL SECURITY;

-- Grant sequence privileges
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Confirmation
SELECT 'Permissions successfully updated for FollowRequest table' as result; 