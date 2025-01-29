// components/AttachmentThumbnail.tsx
// This component displays a thumbnail for an attachment, including handling signed URLs and loading states.
'use client';

import { ThumbnailAttachment } from '@/types/component-interfaces';
import Image from 'next/image';
import { FileIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';

// Set worker path to minified version without source maps
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
  const combinedClassName = `relative ${sizeClass} ${className}`.trim();

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
        // Fallback to a generic PDF icon if preview generation fails
        setPdfPreviewUrl(null);
      }
    };

    void generatePdfPreview();
  }, [attachment]);

  // Get the URL to display
  const displayUrl = getValidImageUrl(attachment.signedUrl) || 
                    getValidImageUrl(attachment.displayUrl) || 
                    getValidImageUrl(attachment.fileUrl);

  if (attachment.fileType.startsWith('image/') && displayUrl) {
    return (
      <div className={combinedClassName}>
        <Image
          src={displayUrl}
          alt={attachment.fileName || 'Image attachment'}
          fill
          className={`rounded-lg ${size === 'lg' ? 'object-contain' : 'object-cover'}`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    );
  }

  if (attachment.fileType === 'application/pdf') {
    if (pdfPreviewUrl) {
      return (
        <div className={combinedClassName}>
          <Image
            src={pdfPreviewUrl}
            alt={attachment.fileName || 'PDF document'}
            fill
            className={`rounded-lg ${size === 'lg' ? 'object-contain' : 'object-cover'}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      );
    }
    // Show PDF icon while preview is loading or if preview generation failed
    return (
      <div className={`${combinedClassName} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <FileIcon className="w-1/3 h-1/3 text-gray-400" />
      </div>
    );
  }

  // Fallback for other file types
  return (
    <div className={`${combinedClassName} bg-gray-100 rounded-lg flex items-center justify-center`}>
      <FileIcon className="w-1/3 h-1/3 text-gray-400" />
    </div>
  );
}