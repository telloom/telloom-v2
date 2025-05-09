-- supabase/mcp_functions/storage_objects_select_policy_update.sql
-- Drop the existing SELECT policy for attachments if it exists with the old name
DROP POLICY IF EXISTS "Allow authenticated users SELECT on attachments" ON storage.objects;

-- Create a more direct SELECT policy for the attachments bucket
CREATE POLICY "Authenticated users can SELECT attachments objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'attachments'); 