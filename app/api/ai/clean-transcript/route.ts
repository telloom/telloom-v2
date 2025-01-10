import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    console.log('Cleaning transcript:', { length: transcript.length });

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

    console.log('Calling Replicate API with prompt length:', input.prompt.length);

    const output = await replicate.run(
      "meta/meta-llama-3-70b-instruct",
      { input }
    );

    console.log('Replicate API response:', { output });

    if (!output) {
      throw new Error('No output received from Replicate API');
    }

    // Join the output array into a single string and remove any potential intro text
    const cleanedTranscript = Array.isArray(output) ? output.join('') : String(output || '');
    const finalTranscript = cleanedTranscript.replace(/^(here'?s? (?:is )?(?:the )?(?:cleaned )?transcript[,:\s]*|cleaned transcript[,:\s]*|transcript[,:\s]*|let'?s? clean (?:up )?this transcript[,:\s]*|step [0-9]+[:.]\s*|here'?s? (?:what|how) (?:i|we) (?:did|cleaned)[,:\s]*)/i, '');

    console.log('Cleaned transcript:', { length: finalTranscript.length });

    return NextResponse.json({ transcript: finalTranscript.trim() });
  } catch (error) {
    console.error('Error in clean-transcript route:', error);
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