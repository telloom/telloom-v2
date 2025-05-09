-- supabase/mcp_functions/storage_bucket_select_policy.sql
-- Policy to allow authenticated users to SELECT (view) the 'attachments' bucket.
-- This is often necessary for signed URL generation and other object operations to succeed.

CREATE POLICY "Authenticated users can view attachments bucket"
ON storage.buckets
FOR SELECT
TO authenticated
USING (id = 'attachments');

-- As an alternative, if authenticated users should see all buckets:
-- CREATE POLICY "Authenticated users can view all buckets"
-- ON storage.buckets
-- FOR SELECT
-- TO authenticated
-- USING (true); 