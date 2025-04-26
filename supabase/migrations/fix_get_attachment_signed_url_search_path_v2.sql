-- supabase/migrations/fix_get_attachment_signed_url_search_path_v2.sql
-- Adjusts the search_path order for the get_attachment_signed_url RPC function.

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_attachment_signed_url(TEXT);

-- Recreate the function with the adjusted search_path order
CREATE OR REPLACE FUNCTION public.get_attachment_signed_url(p_file_path TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Allows the function to use elevated storage privileges
-- Adjusted SET clause: Put supabase_storage first, then storage, then public
SET search_path = supabase_storage, storage, public
AS $$
DECLARE
  signed_url_data JSONB;
BEGIN
  -- Attempt to create a signed URL for the object in the 'attachments' bucket
  -- Expires in 1 hour (3600 seconds)
  -- Explicitly qualify the function call as a best practice
  SELECT supabase_storage.sign_url(p_file_path, 3600)
  INTO signed_url_data
  FROM storage.objects -- Needs 'storage' schema
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
    RAISE WARNING '[get_attachment_signed_url_v2] Exception: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    -- Check for specific schema-related errors (e.g., 3F000 for invalid_schema_name)
    RETURN jsonb_build_object('error', 'An unexpected error occurred: ' || SQLERRM);
END;
$$;

-- Grant execute permission again (important after recreating the function)
GRANT EXECUTE ON FUNCTION public.get_attachment_signed_url(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_attachment_signed_url(TEXT) IS 'v2: Generates a signed URL. Runs with SECURITY DEFINER. Adjusted search_path order.'; 