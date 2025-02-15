-- Drop existing policies
DROP POLICY IF EXISTS "Users can view invitations" ON "Invitation";
DROP POLICY IF EXISTS "Users can create invitations" ON "Invitation";
DROP POLICY IF EXISTS "Users can manage invitations" ON "Invitation";

CREATE POLICY "Users can view invitations"
ON "Invitation"
FOR SELECT
USING (
  -- Inviter (Sharer) can view their sent invitations
  auth.uid() = "inviterId" OR
  -- Invitee can view invitations sent to their email
  auth.uid() IN (
    SELECT id FROM "Profile"
    WHERE email = "inviteeEmail"
  )
);

CREATE POLICY "Users can create invitations"
ON "Invitation"
FOR INSERT
WITH CHECK (
  -- Must be the inviter
  auth.uid() = "inviterId" AND
  -- Must be a sharer
  EXISTS (
    SELECT 1 FROM "ProfileSharer"
    WHERE "profileId" = auth.uid()
    AND id = "sharerId"
  ) AND
  -- Role must be valid
  role IN ('LISTENER', 'EXECUTOR')
);

-- Create function to generate secure invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS text AS $$
DECLARE
  v_token text;
BEGIN
  -- Generate a secure random token (36 characters)
  SELECT encode(gen_random_bytes(18), 'hex') INTO v_token;
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create invitation
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_sharer_id uuid,
  p_invitee_email text,
  p_role text
)
RETURNS uuid AS $$
DECLARE
  v_invitation_id uuid;
  v_token text;
BEGIN
  -- Generate secure token
  SELECT generate_invitation_token() INTO v_token;

  -- Create invitation
  INSERT INTO "Invitation" (
    "sharerId",
    "inviterId",
    "inviteeEmail",
    "role",
    "status",
    "token",
    "createdAt"
  )
  VALUES (
    p_sharer_id,
    auth.uid(),
    p_invitee_email,
    p_role,
    'PENDING',
    v_token,
    now()
  )
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to accept invitation by token
CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(p_token text)
RETURNS void AS $$
DECLARE
  v_invitation "Invitation"%ROWTYPE;
  v_profile_id uuid;
  v_now timestamptz;
BEGIN
  -- Get current timestamp
  v_now := now();

  -- Get invitation details
  SELECT * INTO v_invitation
  FROM "Invitation"
  WHERE token = p_token
  AND status = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Get profile ID for the invitee
  SELECT id INTO v_profile_id
  FROM "Profile"
  WHERE email = v_invitation."inviteeEmail";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for invitation email';
  END IF;

  -- Create appropriate relationship based on role
  IF v_invitation.role = 'EXECUTOR' THEN
    -- Create executor relationship if it doesn't exist
    INSERT INTO "ProfileExecutor" (
      "sharerId",
      "executorId",
      "createdAt"
    )
    VALUES (
      v_invitation."sharerId",
      v_profile_id,
      v_now
    )
    ON CONFLICT ("sharerId", "executorId") DO NOTHING;

    -- Add executor role
    INSERT INTO "ProfileRole" ("profileId", "role", "createdAt")
    VALUES (v_profile_id, 'EXECUTOR', v_now)
    ON CONFLICT ("profileId", "role") DO NOTHING;

    -- Also create listener relationship for executors
    INSERT INTO "ProfileListener" (
      "sharerId",
      "listenerId",
      "sharedSince",
      "hasAccess",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      v_invitation."sharerId",
      v_profile_id,
      v_now,
      true,
      v_now,
      v_now
    )
    ON CONFLICT ("sharerId", "listenerId") DO NOTHING;

    -- Add listener role for executors
    INSERT INTO "ProfileRole" ("profileId", "role", "createdAt")
    VALUES (v_profile_id, 'LISTENER', v_now)
    ON CONFLICT ("profileId", "role") DO NOTHING;
  ELSE
    -- Create listener relationship if it doesn't exist
    INSERT INTO "ProfileListener" (
      "sharerId",
      "listenerId",
      "sharedSince",
      "hasAccess",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      v_invitation."sharerId",
      v_profile_id,
      v_now,
      true,
      v_now,
      v_now
    )
    ON CONFLICT ("sharerId", "listenerId") DO NOTHING;

    -- Add listener role
    INSERT INTO "ProfileRole" ("profileId", "role", "createdAt")
    VALUES (v_profile_id, 'LISTENER', v_now)
    ON CONFLICT ("profileId", "role") DO NOTHING;
  END IF;

  -- Update invitation status
  UPDATE "Invitation"
  SET status = 'ACCEPTED',
      "acceptedAt" = v_now,
      "updatedAt" = v_now
  WHERE id = v_invitation.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to resend invitation
CREATE OR REPLACE FUNCTION public.resend_invitation(p_invitation_id uuid)
RETURNS text AS $$
DECLARE
  v_invitation "Invitation"%ROWTYPE;
  v_new_token text;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM "Invitation"
  WHERE id = p_invitation_id
  AND status = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already processed invitation';
  END IF;

  -- Verify the current user is the inviter
  IF v_invitation."inviterId" != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to resend this invitation';
  END IF;

  -- Generate new token
  SELECT generate_invitation_token() INTO v_new_token;

  -- Update invitation with new token
  UPDATE "Invitation"
  SET token = v_new_token,
      "updatedAt" = now()
  WHERE id = p_invitation_id;

  RETURN v_new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cancel invitation
CREATE OR REPLACE FUNCTION public.cancel_invitation(p_invitation_id uuid)
RETURNS void AS $$
BEGIN
  -- Update invitation status
  UPDATE "Invitation"
  SET status = 'CANCELLED',
      "updatedAt" = now()
  WHERE id = p_invitation_id
  AND status = 'PENDING'
  AND "inviterId" = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation or not authorized to cancel';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 