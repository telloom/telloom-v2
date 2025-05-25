import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabaseAdmin } from '@/utils/supabase/service-role';

// Configure the maximum duration for this function (in seconds)
export const maxDuration = 60;

// Initialize Replicate outside the handler
let replicate: Replicate;
try {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not set');
  }
  replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });
} catch (error) {
  console.error('Failed to initialize Replicate:', error);
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    if (!replicate) {
      return NextResponse.json(
        { error: 'Replicate client not initialized. Check server logs.' },
        { status: 500 }
      );
    }

    // Log that we've started processing
    console.log('Clean transcript API: Handler started', {
      timestamp: new Date().toISOString(),
      hasReplicateToken: !!process.env.REPLICATE_API_TOKEN
    });

    // Log raw request body for debugging
    const rawBody = await request.text();
    console.log('Clean transcript API: Raw request body:', rawBody);

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Clean transcript API: Failed to parse request body', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { transcript, transcriptId, type } = parsedBody;

    if (!transcript || !transcriptId || !type) {
      console.error('Clean transcript API: Missing required fields', { 
        hasTranscript: !!transcript, 
        hasTranscriptId: !!transcriptId, 
        type,
        transcriptLength: transcript?.length
      });
      return NextResponse.json(
        { error: 'Transcript, transcriptId, and type are required' },
        { status: 400 }
      );
    }

    if (!['topic', 'video'].includes(type)) {
      console.error('Clean transcript API: Invalid type', { type });
      return NextResponse.json(
        { error: 'Invalid transcript type. Must be "topic" or "video"' },
        { status: 400 }
      );
    }

    console.log('Clean transcript API: Starting cleaning process', { 
      transcriptLength: transcript.length,
      type,
      transcriptId,
      timestamp: new Date().toISOString()
    });

    // Create the model input exactly as specified in the Replicate docs
    const modelInput = {
      prompt: transcript,
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 2048,
      presence_penalty: 1.15,
      system_prompt: "You are a transcript cleaner. Your task is to remove filler words (um, uh, like, you know) and annotations ([pause], [laughter]) while preserving everything else exactly as written. Format into clear paragraphs for readability. Do not add any text or introductory language such as here's the cleaned transcript. Only provide the cleaned transcript.",
    };

    console.log('Clean transcript API: Calling Replicate API', { 
      promptLength: modelInput.prompt.length,
      timestamp: new Date().toISOString()
    });

    let output;
    try {
      output = await replicate.run(
        "meta/meta-llama-3-70b-instruct",
        { input: modelInput }
      );

      console.log('Clean transcript API: Raw Replicate output:', {
        output,
        type: typeof output,
        isArray: Array.isArray(output)
      });
    } catch (replicateError) {
      console.error('Clean transcript API: Replicate API error', {
        error: replicateError,
        message: eplicateError instanceof Error ? replicateError.message : String(replicateError),
        stack: replicateError instanceof Error ? replicateError.stack : undefined
      });
      return NextResponse.json(
        { error: `Replicate API error: ${replicateError instanceof Error ? replicateError.message : String(replicateError)}` },
        { status: 500 }
      );
    }

    if (!output) {
      console.error('Clean transcript API: No output from Replicate');
      return NextResponse.json(
        { error: 'No output received from Replicate API' },
        { status: 500 }
      );
    }

    // Join the output array into a single string
    const cleanedTranscript = Array.isArray(output) ? output.join('') : String(output || '');
    const finalTranscript = cleanedTranscript.trim();

    // Update the appropriate table based on type
    const tableName = type === 'topic' ? 'TopicVideoTranscript' : 'VideoTranscript';
    
    console.log('Clean transcript API: Updating database', {
      tableName,
      transcriptId,
      finalTranscriptLength: finalTranscript.length
    });

    const { error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({ 
        transcript: finalTranscript,
        updatedAt: new Date().toISOString()
      })
      .eq('id', transcriptId);

    if (updateError) {
      console.error('Clean transcript API: Error updating transcript', {
        error: updateError,
        tableName,
        transcriptId
      });
      return NextResponse.json(
        { error: `Failed to update transcript: ${updateError.message}` },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;
    console.log('Clean transcript API: Cleaning completed', { 
      originalLength: transcript.length,
      cleanedLength: finalTranscript.length,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      transcript: finalTranscript,
      processingTime
    });
  } catch (error) {
    console.error('Clean transcript API: Unhandled error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 