// components/AttachmentThumbnail.tsx
// This component displays a thumbnail for an attachment, including handling signed URLs and loading states.
'use client';

import { useState, useEffect } from 'react';
import { ImageOff, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { urlCache } from '@/utils/url-cache';
import Image from 'next/image';

interface AttachmentThumbnailProps {
  attachment: {
    id: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    signedUrl?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AttachmentThumbnail({ 
  attachment, 
  size = 'md',
  className 
}: AttachmentThumbnailProps) {
  const [signedUrl, setSignedUrl] = useState<string | undefined>(attachment.signedUrl);
  const [isLoading, setIsLoading] = useState(!attachment.signedUrl);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-4 h-4',
    lg: 'w-10 h-10'
  };

  const iconSizes = {
    sm: 'h-1 w-1',
    md: 'h-1.5 w-1.5',
    lg: 'h-3 w-3'
  };

  useEffect(() => {
    async function getSignedUrl() {
      if (!attachment?.fileUrl) {
        setError(true);
        setIsLoading(false);
        return;
      }

      // If this is a preview (local file), use the fileUrl directly
      if (attachment.id === 'preview') {
        setSignedUrl(attachment.fileUrl);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(false);

        // Check if URL is cached
        const cachedUrl = urlCache.get(attachment.id);
        if (cachedUrl) {
          setSignedUrl(cachedUrl);
          setIsLoading(false);
          return;
        }

        // Create Supabase client
        const supabase = createClient();
        // Use the fileUrl exactly as stored (no 'attachments/' prefix)
        const filePath = attachment.fileUrl;

        const { data, error } = await supabase
          .storage
          .from('attachments')
          .createSignedUrl(filePath, 3600); // 1 hour

        if (error) {
          console.error('Error getting signed URL:', error);
          setError(true);
          setIsLoading(false);
          return;
        }

        if (data?.signedUrl) {
          // Cache for slightly less than 1 hour
          urlCache.set(attachment.id, data.signedUrl, 3500);
          setSignedUrl(data.signedUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error in getSignedUrl:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    if (!attachment.signedUrl && attachment.fileUrl) {
      getSignedUrl();
    } else if (attachment.signedUrl) {
      setSignedUrl(attachment.signedUrl);
      setIsLoading(false);
    }
  }, [attachment.id, attachment.fileUrl, attachment.signedUrl]);

  const containerClasses = cn(
    'relative rounded-md overflow-hidden bg-gray-100 flex items-center justify-center',
    sizeClasses[size],
    className
  );

  if (attachment.fileType.startsWith('image/')) {
    if (isLoading) {
      return (
        <div className={containerClasses}>
          <Loader2 className={cn(iconSizes[size], 'animate-spin text-gray-400')} />
        </div>
      );
    }
    if (error || !signedUrl) {
      return (
        <div className={containerClasses}>
          <ImageOff className={cn(iconSizes[size], 'text-gray-400')} />
        </div>
      );
    }
    return (
      <div className={cn(containerClasses, 'aspect-square')}>
        <div className="relative w-full h-full">
          <Image
            src={signedUrl}
            alt={attachment.fileName}
            fill
            className="object-contain"
            sizes={`(max-width: 768px) ${sizeClasses[size].split('w-')[1]}, ${sizeClasses[size].split('w-')[1]}`}
          />
        </div>
      </div>
    );
  }

  // For PDFs
  if (attachment.fileType === 'application/pdf') {
    if (isLoading) {
      return (
        <div className={containerClasses}>
          <Loader2 className={cn(iconSizes[size], 'animate-spin text-gray-400')} />
        </div>
      );
    }
    if (error || !signedUrl) {
      return (
        <div className={containerClasses}>
          <FileText className={cn(iconSizes[size], 'text-gray-400')} />
        </div>
      );
    }
    return (
      <div className={cn(containerClasses, 'aspect-square')}>
        <div className="relative w-full h-full">
          <iframe
            src={signedUrl + '#page=1&view=FitH&toolbar=0'}
            className="w-full h-full pointer-events-none bg-white"
            title="PDF preview"
          />
          {/* Transparent overlay */}
          <div className="absolute inset-0" />
        </div>
      </div>
    );
  }

  // Fallback for other file types
  return (
    <div className={containerClasses}>
      {isLoading ? (
        <Loader2 className={cn(iconSizes[size], 'animate-spin text-gray-400')} />
      ) : (
        <FileText className={cn(iconSizes[size], 'text-gray-400')} />
      )}
    </div>
  );
}