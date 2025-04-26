-- supabase/migrations/<timestamp>_create_upsert_video_rpc.sql
-- Creates the RPC function to handle associating a Mux video with a PromptResponse

CREATE OR REPLACE FUNCTION public.upsert_video_for_prompt_response(
    p_prompt_response_id uuid,
    p_sharer_id uuid,
    p_mux_playback_id text,
    p_mux_asset_id text default null -- Optional asset ID
)
RETURNS jsonb -- Return JSON object containing the video ID
LANGUAGE plpgsql
SECURITY DEFINER -- Use definer to bypass RLS for internal table updates if needed
SET search_path = public
AS $$
DECLARE
    v_video_id uuid;
    v_prompt_id uuid;
    v_has_access boolean;
BEGIN
    -- 1. Authorization Check
    SELECT public.has_sharer_access(p_sharer_id) INTO v_has_access;
    IF NOT v_has_access THEN
        RAISE EXCEPTION 'User % does not have permission to manage video for sharer %', auth.uid(), p_sharer_id;
    END IF;

    -- 2. Get PromptResponse details (including existing videoId and promptId)
    SELECT "videoId", "promptId"
    INTO v_video_id, v_prompt_id
    FROM "PromptResponse"
    WHERE id = p_prompt_response_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PromptResponse not found: %', p_prompt_response_id;
    END IF;

    -- 3. Upsert Video Record
    IF v_video_id IS NULL THEN
        -- Insert new Video record
        INSERT INTO "Video" (
            "profileSharerId",
            "muxPlaybackId",
            "muxAssetId",
            "promptId", -- Store promptId on Video table as well
            "status",
            "createdAt",
            "updatedAt"
        )
        VALUES (
            p_sharer_id,
            p_mux_playback_id,
            p_mux_asset_id,
            v_prompt_id, -- Get promptId from PromptResponse join
            'PROCESSING', -- Initial status
            now(),
            now()
        )
        RETURNING id INTO v_video_id;

        RAISE LOG 'Inserted new Video record % for PromptResponse %', v_video_id, p_prompt_response_id;

    ELSE
        -- Update existing Video record
        UPDATE "Video"
        SET
            "muxPlaybackId" = p_mux_playback_id,
            "muxAssetId" = COALESCE(p_mux_asset_id, "muxAssetId"), -- Only update asset ID if provided
            "status" = 'PROCESSING', -- Reset status on new upload/link
            "updatedAt" = now()
        WHERE id = v_video_id;

        RAISE LOG 'Updated existing Video record % for PromptResponse %', v_video_id, p_prompt_response_id;
    END IF;

    -- 4. Update PromptResponse to link Video
    UPDATE "PromptResponse"
    SET
        "videoId" = v_video_id,
        "updatedAt" = now()
    WHERE id = p_prompt_response_id;

    -- 5. Return the Video ID
    RETURN jsonb_build_object('video_id', v_video_id);

EXCEPTION
    WHEN others THEN
        RAISE LOG 'Error in upsert_video_for_prompt_response: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RAISE; -- Re-raise the exception
END;
$$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE
  ON FUNCTION public.upsert_video_for_prompt_response(uuid, uuid, text, text)
  TO authenticated; 