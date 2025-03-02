-- Create a function to update invitation status with SECURITY DEFINER to bypass RLS
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