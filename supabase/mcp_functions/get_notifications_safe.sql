CREATE OR REPLACE FUNCTION public.get_notifications_safe(p_user_id uuid, p_count_only boolean DEFAULT false, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  unread_count integer;
  v_is_executor boolean;
  -- This will store Profile.id of sharers the current user is an executor for
  v_sharer_profile_ids_for_executor uuid[]; 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION '[get_notifications_safe] User not found: %', p_user_id;
  END IF;

  -- Check if the user is an executor for any sharers and get their Profile.id values
  SELECT EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe WHERE pe."executorId" = p_user_id
  ),
  ARRAY(
    SELECT ps."profileId" -- Select the Profile.id of the Sharer
    FROM "ProfileExecutor" pe
    JOIN "ProfileSharer" ps ON pe."sharerId" = ps.id -- ProfileExecutor.sharerId links to ProfileSharer.id
    WHERE pe."executorId" = p_user_id
  )
  INTO v_is_executor, v_sharer_profile_ids_for_executor;

  RAISE LOG '[get_notifications_safe V3] User ID: %, Is Executor: %, Sharer Profile IDs for Executor: %', p_user_id, v_is_executor, v_sharer_profile_ids_for_executor;

  IF p_count_only THEN
    SELECT count(*) INTO unread_count
    FROM public."Notification" n
    WHERE n."isRead" = false
      AND (
        n."userId" = p_user_id -- Direct notifications for the user (can be Sharer, Listener, or Executor themselves)
        OR (v_is_executor AND n."userId" = ANY(v_sharer_profile_ids_for_executor)) -- Notifications where recipient is a Sharer Profile ID this executor manages
      );
    result := jsonb_build_object('count', unread_count);
  ELSE
    WITH RelevantNotifications AS (
      SELECT 
        n.id,
        n."userId", -- The ID of the original recipient (could be p_user_id or a sharer_profile_id)
        n.type,
        n.message,
        n.data as original_notification_data, -- Keep original data from Notification table
        n."isRead",
        n."createdAt",
        n."updatedAt"
      FROM public."Notification" n
      WHERE (
          n."userId" = p_user_id 
          OR (v_is_executor AND n."userId" = ANY(v_sharer_profile_ids_for_executor))
      )
      ORDER BY n."createdAt" DESC
      LIMIT p_limit
    )
    SELECT jsonb_build_object(
      'notifications',
      COALESCE(jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'id', rn.id,
          'userId', rn."userId", 
          'type', rn.type,
          'message', 
            CASE 
              WHEN rn."userId" != p_user_id AND v_is_executor AND rn."userId" = ANY(v_sharer_profile_ids_for_executor) AND sharer_p."firstName" IS NOT NULL THEN 
                format('For %s %s: %s', sharer_p."firstName", sharer_p."lastName", rn.message)
              ELSE rn.message
            END,
          'data', rn.original_notification_data, -- Use original data from Notification table here
          'isRead', rn."isRead",
          'createdAt', rn."createdAt",
          'updatedAt', rn."updatedAt",
          'actingForSharerInfo', 
            CASE
              WHEN rn."userId" != p_user_id AND v_is_executor AND rn."userId" = ANY(v_sharer_profile_ids_for_executor) THEN jsonb_build_object(
                  'sharerId', (SELECT ps_sub.id FROM "ProfileSharer" ps_sub WHERE ps_sub."profileId" = rn."userId" LIMIT 1),
                  'sharerProfileId', rn."userId",
                  'sharerFirstName', sharer_p."firstName",
                  'sharerLastName', sharer_p."lastName"
              )
              ELSE NULL
            END,
          'followRequestData', 
            CASE
              WHEN rn.type = 'FOLLOW_REQUEST_RECEIVED' AND rn.original_notification_data->>'followRequestId' IS NOT NULL THEN (
                SELECT jsonb_build_object(
                  'followRequestId', fr.id,
                  'status', fr.status,
                  'requestorProfileId', fr."requestorId",
                  'requestorFirstName', p_req."firstName",
                  'requestorLastName', p_req."lastName",
                  'requestorEmail', p_req.email
                )
                FROM "FollowRequest" fr
                JOIN "Profile" p_req ON fr."requestorId" = p_req.id
                WHERE fr.id = (rn.original_notification_data->>'followRequestId')::uuid
              )
              ELSE NULL
            END,
          'invitationData', 
            CASE
              WHEN rn.type = 'INVITATION' AND rn.original_notification_data->>'invitationId' IS NOT NULL THEN (
                SELECT jsonb_build_object(
                  'invitationId', inv.id,
                  'status', inv.status,
                  'inviteeEmail', inv."inviteeEmail",
                  'role', inv.role,
                  'sharerId', inv."sharerId"
                )
                FROM "Invitation" inv
                WHERE inv.id = (rn.original_notification_data->>'invitationId')::uuid
              )
              ELSE NULL
            END
        )) ORDER BY rn."createdAt" DESC
      ), '[]'::jsonb)
    )
    INTO result
    FROM RelevantNotifications rn
    -- Join to get Sharer's name if it's a notification for a represented sharer
    LEFT JOIN "Profile" sharer_p ON (v_is_executor AND rn."userId" != p_user_id AND rn."userId" = ANY(v_sharer_profile_ids_for_executor) AND rn."userId" = sharer_p.id);

  END IF;

  RETURN result;
EXCEPTION
  WHEN others THEN
    RAISE WARNING '[get_notifications_safe] Error fetching notifications for user %: % (SQLSTATE: %)', p_user_id, SQLERRM, SQLSTATE;
    -- Return a valid JSONB error structure if an error occurs
    RETURN jsonb_build_object('error', SQLERRM, 'notifications', '[]'::jsonb);
END;
$function$; 