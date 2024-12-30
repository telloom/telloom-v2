-- Create a function to handle video ready state
CREATE OR REPLACE FUNCTION public.handle_video_ready(
  p_video_id UUID,
  p_mux_playback_id TEXT,
  p_duration FLOAT,
  p_max_width DECIMAL,
  p_max_height DECIMAL,
  p_max_frame_rate DECIMAL,
  p_aspect_ratio TEXT,
  p_video_quality TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prompt_id UUID;
  v_profile_sharer_id UUID;
BEGIN
  -- Start transaction
  BEGIN
    -- Get video information
    SELECT promptId, profileSharerId
    INTO v_prompt_id, v_profile_sharer_id
    FROM public."Video"
    WHERE id = p_video_id;

    -- Update video record
    UPDATE public."Video"
    SET 
      "muxPlaybackId" = p_mux_playback_id,
      status = 'READY',
      duration = p_duration,
      "maxWidth" = p_max_width,
      "maxHeight" = p_max_height,
      "maxFrameRate" = p_max_frame_rate,
      "aspectRatio" = p_aspect_ratio,
      "videoQuality" = p_video_quality,
      "updatedAt" = NOW()
    WHERE id = p_video_id;

    -- Create PromptResponse if it doesn't exist
    INSERT INTO public."PromptResponse" (
      "promptId",
      "videoId",
      "profileSharerId",
      "privacyLevel",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      v_prompt_id,
      p_video_id,
      v_profile_sharer_id,
      'Private',
      NOW(),
      NOW()
    )
    ON CONFLICT ("videoId") DO NOTHING;

    -- Commit transaction
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback transaction on error
      ROLLBACK;
      RAISE;
  END;
END;
$$; 