/**
 * File: components/AttachmentThumbnail.tsx
 * Description: A versatile thumbnail component that displays image or file previews with signed URL support.
 * Handles loading states, error states, and different size variants.
 */

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

      try {
        // Check cache first
        const cachedUrl = urlCache.get(attachment.id);
        if (cachedUrl) {
          setSignedUrl(cachedUrl);
          setError(false);
          setIsLoading(false);
          return;
        }

        // Only create client if needed
        const supabase = createClient();
        
        const filePath = attachment.fileUrl.includes('attachments/') 
          ? attachment.fileUrl.split('attachments/')[1]
          : attachment.fileUrl;
        
        const { data, error } = await supabase
          .storage
          .from('attachments')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) {
          console.error('Error getting signed URL:', error);
          setError(true);
          setIsLoading(false);
          return;
        }

        if (data?.signedUrl) {
          // Cache the URL with expiry time slightly less than the signed URL expiry
          urlCache.set(attachment.id, data.signedUrl, 3500); // Cache for slightly less than 1 hour
          setSignedUrl(data.signedUrl);
          setError(false);
        } else {
          setError(true);
        }
      } catch (error) {
        console.error('Error in getSignedUrl:', error);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    // Only fetch if we don't have a signed URL and there's a fileUrl
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
      <div className={containerClasses} style={{ aspectRatio: '1' }}>
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

  // For non-image files, show an icon
  if (attachment.fileType === 'application/pdf' && signedUrl) {
    return (
      <div className={containerClasses} style={{ position: 'relative' }}>
        <iframe
          src={signedUrl + '#toolbar=0&view=FitH&page=1'}
          className="w-full h-full pointer-events-none"
          title="PDF preview"
          style={{ backgroundColor: 'white' }}
        />
        {/* Transparent overlay to handle clicks */}
        <div className="absolute inset-0" />
      </div>
    );
  }

  // For other non-image files, show an icon
  return (
    <div className={containerClasses}>
      <FileText className={cn(iconSizes[size], 'text-gray-400')} />
    </div>
  );
} 