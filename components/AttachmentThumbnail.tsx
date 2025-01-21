// components/AttachmentThumbnail.tsx
// This component displays a thumbnail for an attachment, including handling signed URLs and loading states.
'use client';

import { ThumbnailAttachment } from '@/types/component-interfaces';
import Image from 'next/image';
import { FileIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AttachmentThumbnailProps {
  attachment: ThumbnailAttachment;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-24 w-24',
  md: 'h-32 w-32',
  lg: 'h-full w-full'
};

export default function AttachmentThumbnail({ attachment, size = 'md', className = '' }: AttachmentThumbnailProps) {
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const sizeClass = sizeClasses[size];
  const combinedClassName = `${sizeClass} ${className}`.trim();

  // Function to validate and process URL
  const getValidImageUrl = (url?: string) => {
    if (!url) return null;
    try {
      // Test if it's a valid URL
      new URL(url);
      return url;
    } catch {
      return null;
    }
  };

  // Function to generate PDF preview
  useEffect(() => {
    const generatePdfPreview = async () => {
      if (!attachment.fileType.startsWith('application/pdf')) return;
      
      const url = getValidImageUrl(attachment.signedUrl) || 
                 getValidImageUrl(attachment.displayUrl) || 
                 getValidImageUrl(attachment.fileUrl);
      
      if (!url) return;

      try {
        // Dynamically import PDF.js
        const pdfjs = await import('pdfjs-dist');
        // Set worker path
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

        // Load the PDF document
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;

        // Get the first page
        const page = await pdf.getPage(1);

        // Set up canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1.0 });

        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render the page
        await page.render({
          canvasContext: context!,
          viewport: viewport
        }).promise;

        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/png');
        setPdfPreviewUrl(dataUrl);
      } catch (error) {
        console.error('Error generating PDF preview:', error);
      }
    };

    void generatePdfPreview();
  }, [attachment]);

  if (attachment.fileType.startsWith('image/')) {
    // Try to get a valid URL from signedUrl, displayUrl, or fileUrl
    const imageUrl = getValidImageUrl(attachment.signedUrl) || 
                    getValidImageUrl(attachment.displayUrl) || 
                    getValidImageUrl(attachment.fileUrl);

    if (!imageUrl) {
      // Show loading state if we don't have a valid URL
      return (
        <div className={`relative ${combinedClassName} bg-gray-100 animate-pulse rounded-lg`} />
      );
    }

    return (
      <div className={`relative ${combinedClassName} rounded-lg overflow-hidden bg-gray-100`}>
        <Image
          src={imageUrl}
          alt={attachment.fileName}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain hover:opacity-90 transition-opacity p-1"
          priority={size === 'lg'}
          unoptimized
        />
      </div>
    );
  }

  if (attachment.fileType === 'application/pdf' && pdfPreviewUrl) {
    return (
      <div className={`relative ${combinedClassName} rounded-lg overflow-hidden bg-gray-100`}>
        <Image
          src={pdfPreviewUrl}
          alt={attachment.fileName}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain hover:opacity-90 transition-opacity p-1"
          priority={size === 'lg'}
        />
      </div>
    );
  }

  // For non-image/pdf files or while PDF is loading, show an icon
  return (
    <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${combinedClassName}`}>
      <FileIcon className="w-1/2 h-1/2 text-gray-400" />
    </div>
  );
}