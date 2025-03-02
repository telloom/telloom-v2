-- Create a function to create a ProfileListener record with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.create_profile_listener(
  p_listener_id UUID,
  p_sharer_id UUID,
  p_shared_since TIMESTAMPTZ,
  p_has_access BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_now TIMESTAMPTZ := COALESCE(p_shared_since, NOW());
BEGIN
  -- Log the function call
  RAISE LOG 'create_profile_listener() called with listener_id: %, sharer_id: %', 
    p_listener_id, p_sharer_id;

  -- Check if the relationship already exists
  SELECT id INTO v_id
  FROM "ProfileListener"
  WHERE "listenerId" = p_listener_id
  AND "sharerId" = p_sharer_id;

  -- If it exists, return the existing ID
  IF v_id IS NOT NULL THEN
    RAISE LOG 'ProfileListener relationship already exists with id: %', v_id;
    RETURN v_id;
  END IF;

  -- Insert new ProfileListener record
  INSERT INTO "ProfileListener" (
    "listenerId",
    "sharerId",
    "sharedSince",
    "hasAccess",
    "notifications",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    p_listener_id,
    p_sharer_id,
    v_now,
    p_has_access,
    TRUE,
    v_now,
    v_now
  )
  RETURNING id INTO v_id;

  RAISE LOG 'Created new ProfileListener with id: %', v_id;
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_profile_listener: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_profile_listener TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_listener TO service_role; 