// components/listener/ListenerAttachmentThumbnail.tsx
// LISTENER-SPECIFIC: Displays a thumbnail for an attachment, without edit/delete actions.
'use client';

import Image from 'next/image';
import { FileIcon, ImageOff, FileWarning, Loader2, Download } from 'lucide-react';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { cn } from '@/lib/utils';
// Removed Button and Tooltip components as action icons are gone

// Set worker path
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Updated props to include onDownloadClick
interface ListenerAttachmentThumbnailProps {
  attachment: {
    id: string;
    signedUrl?: string | null;
    fileName: string;
    fileType?: string | null;
    // Include fileUrl needed for download logic 
    fileUrl: string | null; 
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void; // For opening the dialog
  onError?: () => void; 
  imageError?: boolean; 
  onDownloadClick: (attachmentId: string) => void; // Callback for icon click
}

const sizeClasses = {
  sm: 'h-24 w-24',
  md: 'h-32 w-32',
  lg: 'aspect-square'
};

export default function ListenerAttachmentThumbnail({
  attachment,
  size = 'md',
  className = '',
  onClick, // For opening the dialog
  onError,
  imageError: propImageError,
  onDownloadClick, 
}: ListenerAttachmentThumbnailProps) {
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(propImageError || false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const attemptedUrls = useRef(new Set<string>());

  useEffect(() => {
    setImageError(propImageError || false);
  }, [propImageError]);

  const sizeClass = sizeClasses[size];
  const isImage = attachment?.fileType?.startsWith('image/');
  const isPdf = attachment?.fileType === 'application/pdf';
  const isClickable = !!onClick && (isImage || isPdf);
  const commonClasses = cn(
    'relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center',
    sizeClass,
    className
  );
  const clickableClasses = 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B4332]';
  const nonClickableClasses = 'cursor-default';

  // Resolve and validate the primary URL (same logic)
  useEffect(() => {
    const urlToUse = attachment?.signedUrl;
    let isValidUrl = false;
    if (urlToUse && typeof urlToUse === 'string' && urlToUse.startsWith('http')) {
      try {
        const validUrl = new URL(urlToUse);
        setResolvedUrl(validUrl.toString());
        isValidUrl = true;
      } catch (error) { /* handle error */ }
    }
    if (!isValidUrl) {
       setResolvedUrl(null);
    }
    setImageError(false);
  }, [attachment?.signedUrl, attachment?.id]);

  // Generate PDF preview (same logic)
  useEffect(() => {
    const generatePdfPreview = async () => {
      setPdfLoading(true);
      setPdfError(null);
      setPdfPreviewUrl(null);
      attemptedUrls.current.clear();

      if (!resolvedUrl) {
        setPdfError('Preview URL missing');
        setPdfLoading(false);
        return;
      }

      const pdfUrl = resolvedUrl;
      if (!pdfUrl || attemptedUrls.current.has(pdfUrl)) {
        setPdfLoading(false);
        return;
      }
      attemptedUrls.current.add(pdfUrl);

      try {
        const loadingTask = pdfjs.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          setPdfError('Canvas context error');
          setPdfLoading(false);
          return;
        }

        const viewport = page.getViewport({ scale: 1.0 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        try {
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const dataUrl = canvas.toDataURL('image/png');
          setPdfPreviewUrl(dataUrl);
        } catch (renderError) {
          setPdfError(renderError instanceof Error ? renderError.message : 'PDF render error');
        }
      } catch (error) {
        setPdfError(error instanceof Error ? error.message : 'PDF loading failed');
        setPdfPreviewUrl(null);
      } finally {
        setPdfLoading(false);
      }
    };

    if (attachment && attachment.fileType === 'application/pdf') {
      if (resolvedUrl) {
         void generatePdfPreview();
      } else {
         setPdfLoading(false);
         setPdfError("Missing URL");
         setPdfPreviewUrl(null);
      }
    } else {
        setPdfLoading(false);
        setPdfError(null);
        setPdfPreviewUrl(null);
    }
  }, [resolvedUrl, attachment?.fileType, attachment?.id]);

  // --- Render Logic ---
  const renderContent = () => (
    <>
      {attachment?.fileType === 'application/pdf' && pdfLoading && (
        <Loader2 className="h-5 w-5 animate-spin text-[#1B4332]" />
      )}
      {((attachment?.fileType === 'application/pdf' && pdfError) || !resolvedUrl) && !pdfLoading && (
        <div className="text-center text-xs text-red-600 p-2">
          <FileWarning className="h-5 w-5 mx-auto mb-1" />
          Preview<br/>Unavailable
        </div>
      )}
      {isImage && imageError && !pdfLoading && !pdfError && (
         <div className="text-center text-xs text-muted-foreground p-2">
          <ImageOff className="h-5 w-5 mx-auto mb-1" />
          Image<br/>Not Found
        </div>
      )}
      {isImage && resolvedUrl && !imageError && !pdfLoading && !pdfError && (
        <Image
          src={resolvedUrl}
          alt={attachment.fileName ?? 'Attachment'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
          onError={() => {
            setImageError(true);
            onError?.();
          }}
          unoptimized={true}
        />
      )}
      {attachment?.fileType === 'application/pdf' && pdfPreviewUrl && !pdfLoading && !pdfError && (
        <Image
          src={pdfPreviewUrl}
          alt={`Preview of ${attachment.fileName}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
        />
      )}
      {!isImage && attachment?.fileType !== 'application/pdf' && !pdfLoading && !pdfError && resolvedUrl && (
        <div className="text-center text-xs text-muted-foreground p-2">
          <FileIcon className="h-5 w-5 mx-auto mb-1" />
          {attachment.fileName.length > 15
             ? `${attachment.fileName.substring(0, 12)}...`
             : attachment.fileName
           }
        </div>
      )}
      {resolvedUrl && !imageError && !pdfError && !pdfLoading && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // Prevent parent div click
            onDownloadClick(attachment.id);
          }}
          aria-label={`Download ${attachment.fileName}`}
          className={cn(
            "absolute bottom-1 right-1 p-1 bg-black/40 rounded-full text-white",
            "opacity-0 group-hover:opacity-100",
            "hover:bg-black/70 hover:scale-110",
            "focus:outline-none focus:ring-1 focus:ring-white",
            "transition-all duration-200 ease-in-out z-10"
          )}
        >
          <Download className="h-3 w-3" />
        </button>
      )}
    </>
  );

  // --- REVISED: Always use a div container --- 
  const containerProps = {
      className: cn(
          commonClasses, 
          'group', // Group needed for icon hover
          isClickable ? clickableClasses : nonClickableClasses, // Use updated isClickable
          className // Apply any passed className
      ),
      onClick: isClickable ? onClick : undefined, // Use updated isClickable
      role: isClickable ? 'button' : undefined, // Use updated isClickable
      tabIndex: isClickable ? 0 : undefined, // Use updated isClickable
      'aria-label': isClickable ? `View details for ${attachment.fileName}` : attachment.fileName,
      onKeyDown: isClickable ? (e: React.KeyboardEvent<HTMLDivElement>) => { // Use updated isClickable
          if (e.key === 'Enter' || e.key === ' ') {
              onClick?.();
          }
      } : undefined // Allow activation with Enter/Space if isImage is true
  };

  // Render the container div with content inside
  return React.createElement('div', containerProps, renderContent());
} 