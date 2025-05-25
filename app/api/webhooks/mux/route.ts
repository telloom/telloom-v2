import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/service-role';
import Mux from '@mux/mux-node'; // Import Mux SDK for webhook verification

export async function POST(request: Request) {
  try {
    // Get Mux signature headers
    const headersList = await headers();
    const muxSignature = headersList.get('mux-signature');
    const rawBody = await request.text(); // Read the raw request body ONCE

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && process.env.MUX_VIDEO_WEBHOOK_SECRET) {
      if (!muxSignature) {
        console.warn('[Webhook /mux] Missing Mux signature in production.');
        return NextResponse.json(
          { error: 'Missing Mux signature' },
          { status: 401 }
        );
      }
      try {
        Mux.Webhooks.verifyHeader(rawBody, muxSignature, process.env.MUX_VIDEO_WEBHOOK_SECRET);
        console.log('[Webhook /mux] Mux signature verified successfully.');
      } catch (err) {
        console.error('[Webhook /mux] Invalid Mux signature:', err);
        return NextResponse.json({ error: 'Invalid Mux signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody); // Parse the raw body after verification
    const { type: eventType, data: eventData } = body;
    console.log('Processing webhook event:', { eventType, eventData });

    // Parse passthrough data
    let passthrough;
    try {
      passthrough = JSON.parse(eventData.passthrough || '{}');
    } catch (error) {
      console.error('Error parsing passthrough:', error);
      return NextResponse.json({ error: 'Invalid passthrough data' }, { status: 400 });
    }

    // Initialize videoId
    let videoId = passthrough.videoId;

    // For track.ready events, we'll handle video lookup in the case itself
    if (eventType === 'video.asset.track.ready') {
      // Skip initial video lookup for track ready events
      // We'll look up the video by muxAssetId in the track ready case
      videoId = null; // We'll set this in the track ready case
    } else {
      // Try to find by muxUploadId if not in passthrough
      if (!videoId && eventData.id) {
        console.log('No videoId in passthrough, trying to find by muxUploadId:', eventData.id);
        const { data: videos, error: findError } = await supabaseAdmin
          .from('Video')
          .select('id')
          .eq('muxUploadId', eventData.id)
          .limit(1);

        if (findError) {
          console.error('Error finding video by muxUploadId:', findError);
          return NextResponse.json({ error: 'Error finding video' }, { status: 500 });
        }

        if (videos && videos.length > 0) {
          videoId = videos[0].id;
        }
      }

      if (!videoId) {
        console.error('Could not find videoId');
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }
    }

    // Handle different event types
    switch (eventType) {
      case 'video.upload.asset_created': {
        const { asset_id } = eventData;
        console.log('Processing asset created event:', { asset_id, videoId });

        // Update video record with asset ID
        const { error: updateError } = await supabaseAdmin
          .from('Video')
          .update({
            muxAssetId: asset_id,
            status: 'ASSET_CREATED'
          })
          .eq('id', videoId);

        if (updateError) {
          console.error('Error updating video record:', updateError);
          throw updateError;
        }
        break;
      }

      case 'video.asset.track.ready': {
        const {
          text_source,
          text_type,
          status,
          id: text_track_id,
          asset_id,
          name,
          language_code
        } = eventData;

        console.log('Received track ready event:', {
          text_source,
          text_type,
          status,
          text_track_id,
          asset_id,
          name,
          language_code,
          eventData
        });

        // Only process generated captions
        if (text_source !== 'generated_vod' || text_type !== 'subtitles' || status !== 'ready') {
          console.log('Skipping track event - not a ready generated subtitle:', {
            text_source,
            text_type,
            status
          });
          break;
        }

        // Check if this asset ID exists in the Video table before proceeding
        const { data: checkVideoData, error: checkVideoError } = await supabaseAdmin
          .from('Video')
          .select('id, muxPlaybackId')
          .eq('muxAssetId', asset_id)
          .maybeSingle();

        if (checkVideoError) {
            console.error(`[Main Webhook - Track Ready] Error checking Video table for asset ${asset_id}:`, checkVideoError);
            throw checkVideoError; // Propagate DB errors
        }

        if (!checkVideoData) {
            console.log(`[Webhook - Track Ready] Asset ${asset_id} not found in Video table. Assuming TopicVideo event.`);
            
            // Find the TopicVideo by muxAssetId
            const { data: topicVideo, error: topicVideoError } = await supabaseAdmin
              .from('TopicVideo')
              .select('id, muxPlaybackId')
              .eq('muxAssetId', asset_id)
              .maybeSingle();

            if (topicVideoError) {
              console.error(`[Webhook - Track Ready] Error fetching TopicVideo for asset ${asset_id}:`, topicVideoError);
              throw topicVideoError;
            }

            if (!topicVideo) {
              console.warn(`[Webhook - Track Ready] TopicVideo not found for asset ${asset_id}. Cannot process transcript.`);
              // Return 200 OK as the event might be irrelevant or already processed
              return NextResponse.json({ message: 'TopicVideo not found for this asset, ignoring track.' }, { status: 200 }); 
            }
            
            if (!topicVideo.muxPlaybackId) {
              console.warn(`[Webhook - Track Ready] TopicVideo ${topicVideo.id} found but missing muxPlaybackId. Cannot fetch transcript.`);
               // Return 200 OK, maybe asset isn't fully ready yet
              return NextResponse.json({ message: 'TopicVideo missing playback ID, cannot fetch transcript yet.' }, { status: 200 }); 
            }

            console.log('Found TopicVideo for transcript:', { topicVideoId: topicVideo.id, muxPlaybackId: topicVideo.muxPlaybackId });

            // Fetch the transcript from Mux with retries
            const MAX_RETRIES = 3;
            let transcript = null;
            let lastError = null;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
              try {
                const transcriptUrl = `https://stream.mux.com/${topicVideo.muxPlaybackId}/text/${text_track_id}.txt`;
                console.log(`Fetching TopicVideo transcript (attempt ${attempt}/${MAX_RETRIES}):`, transcriptUrl);
                const transcriptResponse = await fetch(transcriptUrl);
                if (!transcriptResponse.ok) {
                  throw new Error(`Failed to fetch transcript: ${transcriptResponse.statusText}`);
                }
                transcript = await transcriptResponse.text();
                console.log('Successfully fetched TopicVideo transcript, length:', transcript.length);
                break; 
              } catch (error) {
                lastError = error;
                console.error(`TopicVideo transcript fetch attempt ${attempt}/${MAX_RETRIES} failed:`, error);
                if (attempt === MAX_RETRIES) {
                  console.error('All TopicVideo transcript fetch attempts failed');
                  throw lastError;
                }
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
              }
            }

            if (!transcript) {
              throw new Error('Failed to fetch TopicVideo transcript after all retries');
            }

            // Store the transcript in TopicVideoTranscript
            const { error: topicTranscriptError } = await supabaseAdmin
              .from('TopicVideoTranscript')
              .insert({
                topicVideoId: topicVideo.id, // Link to TopicVideo
                transcript,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: text_source,
                type: text_type,
                language: language_code,
                name,
                muxTrackId: text_track_id,
                muxAssetId: asset_id 
              });

            if (topicTranscriptError) {
              console.error('Error storing TopicVideoTranscript:', topicTranscriptError);
              throw topicTranscriptError;
            }
            
            console.log('Successfully stored TopicVideoTranscript for:', { topicVideoId: topicVideo.id });
            // Successfully handled TopicVideo, break the switch case
            break; 
            
        } else {
          // --- CORRECTED logic for VideoTranscript --- 
          videoId = checkVideoData.id; // Use ID from the initial check
          const muxPlaybackId = checkVideoData.muxPlaybackId; // Use playbackId from the initial check
          
          if (!muxPlaybackId) {
             console.error(`[Main Webhook - Track Ready] Video ${videoId} found but missing muxPlaybackId. Cannot fetch transcript.`);
             // Optionally update video status to errored?
             // Return 200 OK for now as the event might be ignorable if playback ID isn't ready
             return NextResponse.json({ message: 'Video found but missing playback ID, cannot fetch transcript yet.' }, { status: 200 }); 
          }

          console.log('Found video for transcript:', { videoId, muxPlaybackId });

          // Fetch the transcript with retries using the correct playback ID
          const MAX_RETRIES = 3;
          let transcript = null;
          let lastError = null;

          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              const transcriptUrl = `https://stream.mux.com/${muxPlaybackId}/text/${text_track_id}.txt`; // Use muxPlaybackId from checkVideoData
              console.log(`Fetching transcript (attempt ${attempt}/${MAX_RETRIES}):`, transcriptUrl);
  
              const transcriptResponse = await fetch(transcriptUrl);
              if (!transcriptResponse.ok) {
                throw new Error(`Failed to fetch transcript: ${transcriptResponse.statusText}`);
              }
  
              transcript = await transcriptResponse.text();
              console.log('Successfully fetched transcript, length:', transcript.length);
              break; // Success, exit retry loop
            } catch (error) {
              lastError = error;
              console.error(`Transcript fetch attempt ${attempt}/${MAX_RETRIES} failed:`, error);
  
              if (attempt === MAX_RETRIES) {
                console.error('All transcript fetch attempts failed');
                throw lastError;
              }
  
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
          
          if (!transcript) {
            throw new Error('Failed to fetch transcript after all retries');
          }

          // Store the transcript in VideoTranscript
          const { error: transcriptError } = await supabaseAdmin
            .from('VideoTranscript') // Saving to the correct table
            .insert({
              videoId: videoId, // Use videoId from checkVideoData
              transcript,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              source: text_source,
              type: text_type,
              language: language_code,
              name,
              muxTrackId: text_track_id,
              muxAssetId: asset_id
            });

          if (transcriptError) {
            console.error('Error storing transcript:', transcriptError);
            throw transcriptError;
          }

          console.log('Successfully stored transcript for video:', {
            videoId: videoId,
            transcriptLength: transcript.length,
            muxAssetId: asset_id,
            muxTrackId: text_track_id,
            language: language_code
          });
          // Successfully handled VideoTranscript, break the switch case
          break; 
        }
        break;
      }

      case 'video.asset.ready': {
        const { id: asset_id, playback_ids, duration, aspect_ratio, max_stored_resolution, max_stored_frame_rate, video_quality, resolution_tier } = eventData;
        console.log('Processing asset ready event:', { videoId, asset_id });

        // Ensure videoId is available (it should be from earlier logic or passthrough)
        if (!videoId) {
            console.error('[Main Webhook - Asset Ready] videoId is missing at the start of the case. Cannot proceed.');
            // Returning 400 as this indicates a logic flaw earlier or bad passthrough
            return NextResponse.json({ error: 'Internal state error: videoId missing' }, { status: 400 });
        }

        // Check if this videoId exists in the Video table before proceeding
        const { data: checkVideoData, error: checkVideoError } = await supabaseAdmin
          .from('Video')
          .select('id, promptId, profileSharerId') // Select fields needed for PromptResponse
          .eq('id', videoId)
          .maybeSingle(); // Use maybeSingle to handle 0 or 1 result

        if (checkVideoError) {
            console.error(`[Main Webhook - Asset Ready] Error checking Video table for video ${videoId}:`, checkVideoError);
            throw checkVideoError; // Propagate DB errors
        }

        if (!checkVideoData) {
            console.log(`[Main Webhook - Asset Ready] Video ${videoId} not found in Video table. Assuming TopicVideo event.`);
            // Check if it exists in TopicVideo
            const { data: checkTopicVideoData, error: checkTopicVideoError } = await supabaseAdmin
              .from('TopicVideo')
              .select('id')
              .eq('id', videoId) 
              .maybeSingle();

            if (checkTopicVideoError) {
                console.error(`[Webhook - Asset Ready] Error checking TopicVideo table for video ${videoId}:`, checkTopicVideoError);
                throw checkTopicVideoError;
            }

            if (!checkTopicVideoData) {
                console.warn(`[Webhook - Asset Ready] Video ID ${videoId} not found in TopicVideo table either. Ignoring asset.ready.`);
                // Not found in either table, so ignore.
                return NextResponse.json({ message: 'Video not found in any relevant table.' }, { status: 200 });
            }
            
            // Video ID found in TopicVideo, proceed with update
            console.log(`[Webhook - Asset Ready] Updating TopicVideo ${videoId} with ready status.`);
            const { error: topicUpdateError } = await supabaseAdmin
              .from('TopicVideo')
              .update({ // Update TopicVideo fields 
                muxAssetId: asset_id,
                muxPlaybackId: playback_ids?.[0]?.id,
                status: 'READY',
                duration,
                aspectRatio: aspect_ratio,
                videoQuality: JSON.stringify(video_quality),
                resolutionTier: resolution_tier,
                maxWidth: parseFloat(max_stored_resolution?.split('x')[0] || '0'),
                maxHeight: parseFloat(max_stored_resolution?.split('x')[1] || '0'),
                maxFrameRate: max_stored_frame_rate
              })
              .eq('id', videoId);

            if (topicUpdateError) {
              console.error(`[Webhook - Asset Ready] Error updating TopicVideo record ${videoId}:`, topicUpdateError);
              throw topicUpdateError;
            }

            console.log(`[Webhook - Asset Ready] Successfully updated TopicVideo record ${videoId} to READY.`);
            // Successfully handled TopicVideo, break the switch case
            break; 

        } else {
          // --- Original Video Logic (with PromptResponse creation restored) --- 
          console.log(`[Main Webhook - Asset Ready] Updating Video ${videoId} with ready status.`);
          const { error: updateError } = await supabaseAdmin
            .from('Video') // Updating the Video table
            .update({ // Update Video fields
              muxAssetId: asset_id,
              muxPlaybackId: playback_ids?.[0]?.id,
              status: 'READY',
              duration,
              aspectRatio: aspect_ratio,
              resolutionTier: resolution_tier,
              maxWidth: parseFloat(max_stored_resolution?.split('x')[0] || '0'),
              maxHeight: parseFloat(max_stored_resolution?.split('x')[1] || '0'),
              maxFrameRate: max_stored_frame_rate
            })
            .eq('id', videoId);

          if (updateError) {
            console.error(`[Main Webhook - Asset Ready] Error updating Video record ${videoId}:`, updateError);
            throw updateError;
          }
          console.log(`[Main Webhook - Asset Ready] Successfully updated Video record ${videoId} to READY.`);

          // --- RESTORED: Create PromptResponse after Video update --- 
          const promptId = checkVideoData.promptId; // Get from initial check
          const profileSharerId = checkVideoData.profileSharerId; // Get from initial check

          if (!promptId || !profileSharerId) {
              console.error(`[Main Webhook - Asset Ready] Missing promptId (${promptId}) or profileSharerId (${profileSharerId}) on Video record ${videoId}. Cannot create PromptResponse.`);
              // Optionally update Video status to ERRORED here?
          } else {
              console.log(`[Main Webhook - Asset Ready] Creating PromptResponse for Video ${videoId}, Prompt ${promptId}, Sharer ${profileSharerId}`);
              const { error: responseError } = await supabaseAdmin
                .from('PromptResponse')
                .insert({
                  profileSharerId: profileSharerId,
                  promptId: promptId,
                  videoId: videoId, 
                  // privacyLevel: 'Private' // Add if needed
                });

              if (responseError) {
                  console.error(`[Main Webhook - Asset Ready] Error creating prompt response for Video ${videoId}:`, responseError);
                  // Optionally update Video status to ERRORED here?
              } else {
                  console.log(`[Main Webhook - Asset Ready] Successfully created PromptResponse for Video ${videoId}.`);
              }
          }
          // --- END RESTORED PromptResponse --- 
        }
        break;
      }

      case 'video.asset.errored': {
        const { errors } = eventData;
        console.log('Processing asset error event:', { videoId, errors });

        // Update video record with error status
        const { error: updateError } = await supabaseAdmin
          .from('Video')
          .update({
            status: 'ERRORED',
            errorMessage: errors?.messages?.join(', ') || 'Unknown error'
          })
          .eq('id', videoId);

        if (updateError) {
          console.error('Error updating video record:', updateError);
          throw updateError;
        }
        break;
      }

      case 'video.asset.static_renditions.ready': {
        const muxAssetId = eventData.id;
        console.log('Processing static renditions ready:', { muxAssetId });
        
        await supabaseAdmin
          .from('VideoDownload')
          .update({ status: 'ready' })
          .eq('muxAssetId', muxAssetId);
        break;
      }

      case 'video.asset.master.ready': {
        const muxAssetId = eventData.id;
        console.log('Processing master ready event:', { muxAssetId });
        
        await supabaseAdmin
          .from('TopicVideoDownload')
          .update({ status: 'ready' })
          .eq('muxAssetId', muxAssetId);
        break;
      }

      default: {
        console.log('Ignoring unhandled event type:', eventType);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 