-- supabase/mcp_functions/revert_storage_objects_select_policy.sql
-- Drop the DEBUG OPEN SELECT policy
DROP POLICY IF EXISTS "Authenticated users can SELECT attachments objects (DEBUG OPEN)" ON storage.objects;

-- Re-create the standard SELECT policy for the attachments bucket
CREATE POLICY "Authenticated users can view attachment objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'attachments'); 