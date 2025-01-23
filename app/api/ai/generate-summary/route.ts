import { NextResponse } from 'next/server';
import Replicate from "replicate";
import { supabaseAdmin } from '@/utils/supabase/service-role';

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const { promptText, promptCategory, firstName, transcript, type, videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('Generate summary API: Missing Replicate API token');
      return NextResponse.json(
        { error: "Replicate API token not configured" },
        { status: 500 }
      );
    }

    console.log('Generate summary API: Starting summary generation', {
      promptCategory,
      transcriptLength: transcript.length,
      type,
      timestamp: new Date().toISOString()
    });

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const systemPrompt = `You are a warm and empathetic AI assistant that writes engaging video summaries. Write in third person, be descriptive but concise, and maintain a semi-casual, warm tone. Write clearly and concisely. Focus on the key points that answer the primary question.`;

    const userPrompt = `Generate a one-paragraph summary of a video response where ${firstName} answers the question: "${promptText}" (from the topic: ${promptCategory}).

Here's the transcript of their response:
${transcript}`;

    const input = {
      top_p: 0.9,
      prompt: userPrompt,
      min_tokens: 0,
      temperature: 0.7,
      prompt_template: "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n" + systemPrompt + "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
      presence_penalty: 1.15
    };

    console.log('Generate summary API: Calling Replicate API', {
      promptLength: input.prompt.length,
      timestamp: new Date().toISOString()
    });

    let fullResponse = "";
    try {
      for await (const event of replicate.stream("meta/meta-llama-3-70b-instruct", { input })) {
        fullResponse += event;
      }
    } catch (streamError) {
      console.error('Generate summary API: Stream error', {
        error: streamError instanceof Error ? streamError.message : 'Unknown stream error',
        timestamp: new Date().toISOString()
      });
      throw streamError;
    }

    const summary = fullResponse.trim();
    
    console.log('Generate summary API: Attempting to save summary', {
      type,
      videoId,
      summaryLength: summary.length,
      tableName: type === 'topic' ? 'TopicVideo' : 'PromptResponse',
      timestamp: new Date().toISOString()
    });
    
    // Update the appropriate table based on type
    if (type === 'topic') {
      const { error: updateError } = await supabaseAdmin
        .from('TopicVideo')
        .update({ 
          summary,
          updatedAt: new Date().toISOString()
        })
        .eq('id', videoId)
        .select();

      if (updateError) {
        console.error('Generate summary API: Error updating summary', {
          error: updateError,
          tableName: 'TopicVideo',
          videoId
        });
        throw updateError;
      }
    } else {
      const { error: updateError } = await supabaseAdmin
        .from('PromptResponse')
        .update({ 
          summary,
          updatedAt: new Date().toISOString()
        })
        .eq('videoId', videoId)
        .select();

      if (updateError) {
        console.error('Generate summary API: Error updating summary', {
          error: updateError,
          tableName: 'PromptResponse',
          videoId
        });
        throw updateError;
      }
    }

    const processingTime = Date.now() - startTime;
    console.log('Generate summary API: Summary generation completed', {
      summaryLength: summary.length,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ summary });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Generate summary API: Error occurred', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
} 