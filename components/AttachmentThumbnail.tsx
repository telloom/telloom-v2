/**
 * File: components/AttachmentThumbnail.tsx
 * Description: A versatile thumbnail component that displays image or file previews with signed URL support.
 * Handles loading states, error states, and different size variants. Automatically manages Supabase signed URLs
 * for secure file access and provides fallback icons for non-image files.
 */

'use client';

import { useState, useEffect } from 'react';
import { ImageOff, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
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
  console.log('AttachmentThumbnail render:', {
    id: attachment.id,
    fileUrl: attachment.fileUrl,
    fileType: attachment.fileType,
    fileName: attachment.fileName,
    hasSignedUrl: !!attachment.signedUrl,
    size
  });

  const [signedUrl, setSignedUrl] = useState<string | undefined>(attachment.signedUrl);
  const [isLoading, setIsLoading] = useState(!attachment.signedUrl);
  const [error, setError] = useState(false);

  // Size classes for different thumbnail sizes
  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-4 h-4',
    lg: 'w-10 h-10'
  };

  // Icon sizes for different thumbnail sizes
  const iconSizes = {
    sm: 'h-1 w-1',
    md: 'h-1.5 w-1.5',
    lg: 'h-3 w-3'
  };

  useEffect(() => {
    async function getSignedUrl() {
      console.log('[AttachmentThumbnail] Starting signed URL generation', {
        attachmentId: attachment?.id,
        fileUrl: attachment?.fileUrl,
        fileType: attachment?.fileType
      });

      if (!attachment?.fileUrl) {
        console.log('[AttachmentThumbnail] No fileUrl provided');
        setError(true);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        
        // Extract just the file path from the fileUrl
        // Remove any storage URLs or 'attachments/' prefix
        const filePath = attachment.fileUrl.includes('attachments/') 
          ? attachment.fileUrl.split('attachments/')[1]
          : attachment.fileUrl;

        console.log('[AttachmentThumbnail] Getting signed URL for path:', filePath);
        
        const { data, error } = await supabase
          .storage
          .from('attachments')
          .createSignedUrl(filePath, 3600);

        if (error) {
          console.error('Error getting signed URL:', {
            error: {
              message: error.message,
              name: error.name
            },
            attachment: {
              id: attachment.id,
              fileUrl: attachment.fileUrl,
              filePath: filePath,
              fileType: attachment.fileType
            }
          });
          setError(true);
          setIsLoading(false);
          return;
        }

        if (data?.signedUrl) {
          console.log('[AttachmentThumbnail] Successfully got signed URL:', {
            id: attachment.id,
            hasSignedUrl: true
          });
          setSignedUrl(data.signedUrl);
          setError(false);
        } else {
          console.error('[AttachmentThumbnail] No signed URL in response:', {
            data,
            attachment: {
              id: attachment.id,
              fileUrl: attachment.fileUrl,
              filePath: filePath
            }
          });
          setError(true);
        }
      } catch (error) {
        console.error('[AttachmentThumbnail] Unexpected error getting signed URL:', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack
          } : error,
          attachment: {
            id: attachment.id,
            fileUrl: attachment.fileUrl,
            fileType: attachment.fileType
          }
        });
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    if (!attachment.signedUrl) {
      getSignedUrl();
    } else {
      setSignedUrl(attachment.signedUrl);
      setIsLoading(false);
    }
  }, [attachment]);

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
      console.log('Showing error state:', {
        id: attachment.id,
        hasError: error,
        hasSignedUrl: !!signedUrl
      });
      return (
        <div className={containerClasses}>
          <ImageOff className={cn(iconSizes[size], 'text-gray-400')} />
        </div>
      );
    }

    console.log('Rendering image:', {
      id: attachment.id,
      signedUrl,
      size
    });

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
  return (
    <div className={containerClasses}>
      <FileText className={cn(iconSizes[size], 'text-gray-400')} />
    </div>
  );
} 