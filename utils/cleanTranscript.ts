export async function cleanTranscript({
  transcript
}: {
  transcript: string;
}): Promise<string> {
  const response = await fetch('/api/ai/clean-transcript', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to clean transcript');
  }

  const data = await response.json();
  
  if (!data.transcript) {
    throw new Error('No cleaned transcript received from API');
  }

  return data.transcript;
} 