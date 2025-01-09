import { NextResponse } from 'next/server';
import Replicate from "replicate";

export async function POST(request: Request) {
  try {
    const { promptText, promptCategory, firstName, transcript } = await request.json();

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Replicate API token not configured" },
        { status: 500 }
      );
    }

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

    let fullResponse = "";
    for await (const event of replicate.stream("meta/meta-llama-3-70b-instruct", { input })) {
      fullResponse += event;
    }

    return NextResponse.json({ summary: fullResponse.trim() });
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
} 