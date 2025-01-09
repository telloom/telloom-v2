import Replicate from "replicate";

interface GenerateAISummaryParams {
  promptText: string;
  promptCategory: string;
  firstName: string;
  transcript: string;
}

export async function generateAISummary({
  promptText,
  promptCategory,
  firstName,
  transcript,
}: GenerateAISummaryParams): Promise<string> {
  try {
    const response = await fetch('/api/ai/generate-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        promptText,
        promptCategory,
        firstName,
        transcript,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate summary');
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error("Error generating AI summary:", error);
    throw new Error("Failed to generate AI summary");
  }
} 