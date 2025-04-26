-- supabase/migrations/fix_get_attachment_signed_url_search_path.sql
-- Fixes the search_path for the get_attachment_signed_url RPC function to include supabase_storage.

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_attachment_signed_url(TEXT);

-- Recreate the function with the corrected search_path
CREATE OR REPLACE FUNCTION public.get_attachment_signed_url(p_file_path TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Allows the function to use elevated storage privileges
-- Corrected SET clause: include supabase_storage and storage schemas
SET search_path = public, storage, supabase_storage
AS $$
DECLARE
  signed_url_data JSONB;
  error_data JSONB;
BEGIN
  -- Attempt to create a signed URL for the object in the 'attachments' bucket
  -- Expires in 1 hour (3600 seconds)
  -- NOTE: The function call supabase_storage.sign_url is now correctly schema-qualified,
  -- but setting search_path is belt-and-suspenders.
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
    RETURN jsonb_build_object('error', 'Failed to generate signed URL. Object may not exist or permissions issue.');
  END IF;

EXCEPTION
  WHEN others THEN
    -- Catch any other unexpected errors during the process
    RAISE WARNING '[get_attachment_signed_url] Exception: %', SQLERRM;
    RETURN jsonb_build_object('error', 'An unexpected error occurred: ' || SQLERRM);
END;
$$;

-- Grant execute permission again (important after recreating the function)
GRANT EXECUTE ON FUNCTION public.get_attachment_signed_url(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_attachment_signed_url(TEXT) IS 'Generates a signed URL for a given file path in the attachments bucket. Runs with SECURITY DEFINER. Includes supabase_storage in search_path.'; 