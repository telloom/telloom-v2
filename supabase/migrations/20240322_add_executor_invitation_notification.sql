-- Create a function to handle executor invitation notifications
CREATE OR REPLACE FUNCTION public.handle_executor_invitation_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_invitee_profile_id uuid;
  v_sharer_profile record;
BEGIN
  -- Only proceed if this is an EXECUTOR invitation
  IF NEW.role != 'EXECUTOR' THEN
    RETURN NEW;
  END IF;

  -- Check if invitee already has a profile
  SELECT id INTO v_invitee_profile_id
  FROM "Profile"
  WHERE email = LOWER(NEW."inviteeEmail");

  -- If invitee has a profile, create a notification
  IF v_invitee_profile_id IS NOT NULL THEN
    -- Get sharer's profile information
    SELECT p.* INTO v_sharer_profile
    FROM "Profile" p
    JOIN "ProfileSharer" ps ON ps."profileId" = p.id
    WHERE ps.id = NEW."sharerId";

    -- Create notification
    INSERT INTO "Notification" (
      "id",
      "userId",
      "type",
      "message",
      "data",
      "isRead",
      "createdAt",
      "updatedAt"
    ) VALUES (
      gen_random_uuid(),
      v_invitee_profile_id,
      'INVITATION',
      format(
        'You have been invited by %s %s to be an executor',
        v_sharer_profile."firstName",
        v_sharer_profile."lastName"
      ),
      jsonb_build_object(
        'invitationId', NEW.id,
        'sharerId', NEW."sharerId",
        'role', NEW.role,
        'sharer', jsonb_build_object(
          'firstName', v_sharer_profile."firstName",
          'lastName', v_sharer_profile."lastName",
          'email', v_sharer_profile.email
        )
      ),
      false,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new invitations
DROP TRIGGER IF EXISTS executor_invitation_notification_trigger ON "Invitation";
CREATE TRIGGER executor_invitation_notification_trigger
  AFTER INSERT ON "Invitation"
  FOR EACH ROW
  EXECUTE FUNCTION handle_executor_invitation_notification(); 