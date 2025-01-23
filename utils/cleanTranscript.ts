export async function cleanTranscript({
  transcript,
  transcriptId,
  type,
}: {
  transcript: string;
  transcriptId: string;
  type: 'topic' | 'video';
}): Promise<string> {
  try {
    // Validate required parameters
    if (!transcript || !transcriptId || !type) {
      console.error('Missing required parameters:', {
        hasTranscript: !!transcript,
        hasTranscriptId: !!transcriptId,
        type
      });
      throw new Error('Missing required parameters for transcript cleaning');
    }

    console.log('Cleaning transcript:', {
      transcriptLength: transcript.length,
      transcriptId,
      type
    });

    const response = await fetch('/api/ai/clean-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript, transcriptId, type }),
    });

    // Clone the response before reading it
    const responseClone = response.clone();
    
    try {
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error response from clean transcript API:', {
          status: response.status,
          data
        });
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }
      
      if (!data.transcript) {
        console.error('No transcript in response:', data);
        throw new Error('No cleaned transcript received from API');
      }

      console.log('Successfully cleaned transcript:', {
        originalLength: transcript.length,
        cleanedLength: data.transcript.length,
        processingTime: data.processingTime
      });

      return data.transcript;
    } catch (parseError) {
      // If JSON parsing fails, try to get the raw text from the cloned response
      const errorText = await responseClone.text();
      console.error('Failed to parse API response:', {
        status: response.status,
        responseText: errorText,
        parseError
      });
      throw new Error(`Failed to parse API response: ${errorText}`);
    }
  } catch (error) {
    console.error('Error in cleanTranscript:', error);
    throw error;
  }
} 