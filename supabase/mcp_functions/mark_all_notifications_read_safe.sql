-- supabase/mcp_functions/mark_all_notifications_read_safe.sql
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read_safe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Important for auth.uid() and direct table access
SET search_path TO 'public'
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
  v_is_executor boolean;
  v_sharer_profile_ids_for_executor uuid[];
BEGIN
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION '[mark_all_notifications_read_safe] User not authenticated.';
  END IF;

  -- Check if the current user is an executor for any sharers and get their Profile.id values
  SELECT EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe WHERE pe."executorId" = v_current_user_id
  ),
  ARRAY(
    SELECT ps."profileId" -- Select the Profile.id of the Sharer
    FROM "ProfileExecutor" pe
    JOIN "ProfileSharer" ps ON pe."sharerId" = ps.id
    WHERE pe."executorId" = v_current_user_id
  )
  INTO v_is_executor, v_sharer_profile_ids_for_executor;

  RAISE LOG '[mark_all_notifications_read_safe] User ID: %, Is Executor: %, Sharer Profile IDs for Executor: %', v_current_user_id, v_is_executor, v_sharer_profile_ids_for_executor;

  -- Update notifications where the recipient is the current user directly
  UPDATE "Notification"
  SET "isRead" = true, "updatedAt" = now()
  WHERE "userId" = v_current_user_id AND "isRead" = false;

  -- If the user is an executor, also update notifications for the sharers they represent
  IF v_is_executor AND array_length(v_sharer_profile_ids_for_executor, 1) > 0 THEN
    UPDATE "Notification"
    SET "isRead" = true, "updatedAt" = now()
    WHERE "userId" = ANY(v_sharer_profile_ids_for_executor) AND "isRead" = false;
  END IF;

  RAISE LOG '[mark_all_notifications_read_safe] Marked notifications as read for user % and their represented sharers (if any).', v_current_user_id;

EXCEPTION
  WHEN others THEN
    RAISE WARNING '[mark_all_notifications_read_safe] Error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE; -- Re-raise the exception to ensure the client knows something went wrong
END;
$$; 