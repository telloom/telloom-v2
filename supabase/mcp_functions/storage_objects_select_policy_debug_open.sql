-- supabase/mcp_functions/storage_objects_select_policy_debug_open.sql
-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Authenticated users can SELECT attachments objects" ON storage.objects;

-- Create a very open SELECT policy for debugging
CREATE POLICY "Authenticated users can SELECT attachments objects (DEBUG OPEN)"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'attachments' AND true); -- Effectively makes it open for any object in the bucket 