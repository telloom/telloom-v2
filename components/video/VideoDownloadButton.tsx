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
  topicName?: string;
}

export function VideoDownloadButton({ 
  muxAssetId, 
  className,
  videoType = 'prompt',
  userId,
  topicName = ''
}: VideoDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [userProfile, setUserProfile] = useState<{ firstName: string; lastName: string; } | null>(null);

  useEffect(() => {
    // Lightweight check if download is available when component mounts
    const checkAvailability = async () => {
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
            checkAvailabilityOnly: true // New flag to indicate this is just a check
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to check download availability');
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

  // Fetch user profile when userId changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      const supabase = createClient();
      try {
        // First get the ProfileSharer record
        const { data: sharer, error: sharerError } = await supabase
          .from('ProfileSharer')
          .select('profileId')
          .eq('id', userId)
          .single();

        if (sharerError) {
          console.error('Error fetching ProfileSharer:', sharerError);
          return;
        }

        if (!sharer) {
          console.error('No ProfileSharer found');
          return;
        }

        // Then get the Profile information
        const { data: profile, error: profileError } = await supabase
          .from('Profile')
          .select('firstName, lastName')
          .eq('id', sharer.profileId)
          .single();

        if (profileError) {
          console.error('Error fetching Profile:', profileError);
          return;
        }

        if (profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error in profile fetch chain:', error);
      }
    };

    fetchUserProfile();
  }, [userId]);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      
      // Generate a 4-digit UUID
      const shortUuid = uuidv4().substring(0, 4);

      // Create filename with user's name if available
      let filename = 'video.mp4';
      if (userProfile) {
        const sanitizedTopicName = topicName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        filename = `${userProfile.lastName}-${userProfile.firstName}_${sanitizedTopicName}_${shortUuid}.mp4`;
      }

      const response = await fetch('/api/mux/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          muxAssetId,
          quality: 'original',
          videoType,
          checkAvailabilityOnly: false // Explicitly indicate this is a download request
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download video');
      }

      // Create a blob from the video stream
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
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
      className={`${className} border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full`}
      disabled={isLoading || !isAvailable}
      onClick={handleDownload}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="ml-2">Download</span>
    </Button>
  );
} 