import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const { transcript } = await request.json();

    if (!transcript) {
      console.error('Clean transcript API: Missing transcript');
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    console.log('Clean transcript API: Starting cleaning process', { 
      transcriptLength: transcript.length,
      timestamp: new Date().toISOString()
    });

    const input = {
      top_p: 0.9,
      temperature: 0.1,
      prompt: `Work through this task step by step:

Clean up this transcript by removing filler words (um, uh, like, you know, etc.) and any annotations (e.g. [pause], [laughter], etc.) and format into paragraphs for readability. Do not make any other changes. Preserve the exact wording, grammar, and sentence structure. Do not add any introductory text or explanations.

Transcript to clean:
${transcript}`,
      min_tokens: 0,
      prompt_template: "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nYou are a transcript cleaner. Your only task is to remove filler words and annotations while preserving everything else exactly as written. Never add any introductory text or explanations.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
      presence_penalty: 1.15
    };

    console.log('Clean transcript API: Calling Replicate API', { 
      promptLength: input.prompt.length,
      timestamp: new Date().toISOString()
    });

    const output = await replicate.run(
      "meta/meta-llama-3-70b-instruct",
      { input }
    );

    console.log('Clean transcript API: Received Replicate response', { 
      outputReceived: !!output,
      timestamp: new Date().toISOString()
    });

    if (!output) {
      console.error('Clean transcript API: No output from Replicate');
      throw new Error('No output received from Replicate API');
    }

    // Join the output array into a single string and remove any potential intro text
    const cleanedTranscript = Array.isArray(output) ? output.join('') : String(output || '');
    const finalTranscript = cleanedTranscript.replace(/^(here'?s? (?:is )?(?:the )?(?:cleaned )?transcript[,:\s]*|cleaned transcript[,:\s]*|transcript[,:\s]*|let'?s? clean (?:up )?this transcript[,:\s]*|step [0-9]+[:.]\s*|here'?s? (?:what|how) (?:i|we) (?:did|cleaned)[,:\s]*)/i, '');

    const processingTime = Date.now() - startTime;
    console.log('Clean transcript API: Cleaning completed', { 
      originalLength: transcript.length,
      cleanedLength: finalTranscript.length,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ transcript: finalTranscript.trim() });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Clean transcript API: Error occurred', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred while cleaning the transcript' },
      { status: 500 }
    );
  }
} 