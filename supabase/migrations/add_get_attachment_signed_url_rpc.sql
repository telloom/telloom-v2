-- supabase/migrations/add_get_attachment_signed_url_rpc.sql
-- Adds an RPC function to generate signed URLs for attachments securely.

CREATE OR REPLACE FUNCTION public.get_attachment_signed_url(p_file_path TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Allows the function to use elevated storage privileges
SET search_path = public -- Ensures storage schema is accessible
AS $$
DECLARE
  signed_url_data JSONB;
  error_data JSONB;
BEGIN
  -- Attempt to create a signed URL for the object in the 'attachments' bucket
  -- Expires in 1 hour (3600 seconds)
  SELECT supabase_storage.sign_url(p_file_path, 3600) 
  INTO signed_url_data
  FROM storage.objects
  WHERE storage.objects.bucket_id = 'attachments'
    AND storage.objects.name = p_file_path;

  -- Check if the URL was successfully generated
  IF signed_url_data IS NOT NULL AND signed_url_data->>'signedURL' IS NOT NULL THEN
    RETURN jsonb_build_object('signedUrl', signed_url_data->>'signedURL');
  ELSE
    -- Handle cases where the object might not exist or signing failed
    -- Try fetching the error if available from Supabase internal signing function details (may vary)
    -- For simplicity, return a structured error message
    RETURN jsonb_build_object('error', 'Failed to generate signed URL. Object may not exist or permissions issue.');
  END IF;

EXCEPTION
  WHEN others THEN
    -- Catch any other unexpected errors during the process
    RETURN jsonb_build_object('error', 'An unexpected error occurred: ' || SQLERRM);
END;
$$;

-- Grant execute permission to the 'authenticated' role so logged-in users can call it
GRANT EXECUTE ON FUNCTION public.get_attachment_signed_url(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_attachment_signed_url(TEXT) IS 'Generates a signed URL for a given file path in the attachments bucket. Runs with SECURITY DEFINER.'; 