-- Function to create a ProfileListener record with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.create_profile_listener(
  p_listener_id UUID,
  p_sharer_id UUID,
  p_shared_since TIMESTAMPTZ DEFAULT NOW(),
  p_has_access BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
  v_now TIMESTAMPTZ := COALESCE(p_shared_since, NOW());
BEGIN
  -- Log the function call
  RAISE LOG 'create_profile_listener() called with listener_id: %, sharer_id: %', 
    p_listener_id, p_sharer_id;

  -- Check if the relationship already exists
  SELECT id INTO v_existing_id
  FROM "ProfileListener"
  WHERE "listenerId" = p_listener_id AND "sharerId" = p_sharer_id;

  -- If it exists, return the existing ID
  IF v_existing_id IS NOT NULL THEN
    RAISE LOG 'ProfileListener relationship already exists with id: %', v_existing_id;
    RETURN v_existing_id;
  END IF;

  -- Insert the new record
  INSERT INTO "ProfileListener" (
    "listenerId", 
    "sharerId", 
    "sharedSince", 
    "hasAccess", 
    "createdAt", 
    "updatedAt"
  )
  VALUES (
    p_listener_id, 
    p_sharer_id, 
    v_now, 
    p_has_access, 
    v_now, 
    v_now
  )
  RETURNING id INTO v_new_id;

  RAISE LOG 'Created new ProfileListener with id: %', v_new_id;
  RETURN v_new_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_profile_listener: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_profile_listener TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_listener TO service_role;

-- Function to create a ProfileExecutor record with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.create_profile_executor(
  p_executor_id UUID,
  p_sharer_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Log the function call
  RAISE LOG 'create_profile_executor() called with executor_id: %, sharer_id: %', 
    p_executor_id, p_sharer_id;

  -- Check if the relationship already exists
  SELECT id INTO v_existing_id
  FROM "ProfileExecutor"
  WHERE "executorId" = p_executor_id AND "sharerId" = p_sharer_id;

  -- If it exists, return the existing ID
  IF v_existing_id IS NOT NULL THEN
    RAISE LOG 'ProfileExecutor relationship already exists with id: %', v_existing_id;
    RETURN v_existing_id;
  END IF;

  -- Insert the new record
  INSERT INTO "ProfileExecutor" (
    "executorId", 
    "sharerId", 
    "createdAt", 
    "updatedAt"
  )
  VALUES (
    p_executor_id, 
    p_sharer_id, 
    v_now, 
    v_now
  )
  RETURNING id INTO v_new_id;

  RAISE LOG 'Created new ProfileExecutor with id: %', v_new_id;
  RETURN v_new_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_profile_executor: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_profile_executor TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_executor TO service_role;

-- Function to update invitation status with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.update_invitation_status(
  p_invitation_id UUID,
  p_status TEXT,
  p_accepted_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_now TIMESTAMPTZ := COALESCE(p_accepted_at, NOW());
BEGIN
  -- Log the function call
  RAISE LOG 'update_invitation_status() called with invitation_id: %, status: %', 
    p_invitation_id, p_status;

  -- Update the invitation status
  UPDATE "Invitation"
  SET 
    "status" = p_status::"InvitationStatus",
    "acceptedAt" = CASE WHEN p_status = 'ACCEPTED' THEN v_now ELSE "acceptedAt" END,
    "updatedAt" = v_now
  WHERE "id" = p_invitation_id
  RETURNING "id" INTO v_id;

  -- If no rows were updated, the invitation doesn't exist
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Invitation with ID % not found', p_invitation_id;
  END IF;

  RAISE LOG 'Updated invitation status to % for invitation with id: %', p_status, v_id;
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_invitation_status: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_invitation_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_invitation_status TO service_role; 