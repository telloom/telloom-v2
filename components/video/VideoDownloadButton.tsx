import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface VideoDownloadButtonProps {
  muxAssetId: string;
  className?: string;
  videoType?: 'prompt' | 'topic';
  userId?: string | null;
  promptCategoryName?: string;
}

export function VideoDownloadButton({ 
  muxAssetId, 
  className,
  videoType = 'prompt',
  userId: profileSharerId,
  promptCategoryName = ''
}: VideoDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  console.log(`[VideoDownloadButton Render] Received userId prop: ${profileSharerId}`);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!muxAssetId) return;
      try {
        const response = await fetch('/api/mux/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            muxAssetId,
            quality: 'info',
            videoType,
            checkAvailabilityOnly: true
          }),
        });

        if (!response.ok) {
          let errorMsg = 'Failed to check download availability';
          try {
             const errorData = await response.json();
             errorMsg = errorData.error || errorMsg;
          } catch (_) {
             // Ignore if response is not JSON
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        setIsAvailable(data.isAvailable);
      } catch (error) {
        console.error('Error checking download availability:', error);
        setIsAvailable(false);
      }
    };

    checkAvailability();

  }, [muxAssetId, videoType]);

  const handleDownload = async () => {
    if (!muxAssetId) {
      toast.error('Cannot download: Missing video asset ID.');
      return;
    }
    if (!profileSharerId) {
      toast.error('Cannot download: User information missing.');
      return;
    }

    console.log(`[VideoDownloadButton handleDownload] Check: profileSharerId = ${profileSharerId}`);

    console.log(`[VideoDownloadButton] handleDownload: profileSharerId=${profileSharerId}, promptCategoryName=${promptCategoryName}`);

    try {
      setIsLoading(true);

      const response = await fetch('/api/mux/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          muxAssetId,
          quality: 'original',
          videoType,
          checkAvailabilityOnly: false,
          userId: profileSharerId,
          topicName: promptCategoryName
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to download video';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (_) { /* Ignore if response is not JSON */ }
        throw new Error(errorMsg);
      }

      const disposition = response.headers.get('content-disposition');
      let filename = 'telloom-video.mp4';
      if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) { 
            filename = matches[1].replace(/['"]/g, '');
          }
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download video');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      className={`${className} rounded-full`}
      disabled={isLoading || !isAvailable}
      onClick={handleDownload}
      aria-label="Download video response"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download
        </>
      )}
    </Button>
  );
} 