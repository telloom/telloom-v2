// components/AttachmentThumbnail.tsx
// This component displays a thumbnail for an attachment, including handling signed URLs and loading states.
'use client';

import { ThumbnailAttachment } from '@/types/component-interfaces';
import Image from 'next/image';
import { FileIcon, ImageOff, FileWarning, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { cn } from '@/lib/utils';

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
  // Log the received attachment prop
  console.log('[ATTACHMENT_THUMBNAIL] Received props:', { attachment, size, className });

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const attemptedUrls = useRef(new Set<string>());
  
  const sizeClass = sizeClasses[size];
  const combinedClassName = `relative ${sizeClass} ${className}`.trim();

  // Resolve and validate the primary URL for display
  useEffect(() => {
    const urlToUse = attachment?.signedUrl;
    let isValidUrl = false;

    console.log(`[ATTACHMENT_THUMBNAIL useEffect URL Resolution] Received signedUrl prop: ${urlToUse} for attachment ID: ${attachment?.id}`);

    if (urlToUse && typeof urlToUse === 'string' && urlToUse.startsWith('http')) {
      try {
        // Validate the URL structure
        const validUrl = new URL(urlToUse);
        setResolvedUrl(validUrl.toString());
        isValidUrl = true;
        console.log(`[ATTACHMENT_THUMBNAIL] Resolved URL set to: ${validUrl.toString()}`);
      } catch (error) {
        console.error('[ATTACHMENT_THUMBNAIL] Invalid signed URL structure found:', urlToUse, error);
        // setResolvedUrl(null); // Handled below
      }
    } 
    
    if (!isValidUrl) {
       console.warn('[ATTACHMENT_THUMBNAIL] No valid signedUrl provided or URL invalid for attachment:', attachment?.id);
       setResolvedUrl(null); // Ensure resolvedUrl is null if no valid signedUrl
    }
    // Only reset image error when the source URL potentially changes
    setImageError(false); 
  // Depend only on the source URL
  }, [attachment?.signedUrl, attachment?.id]);

  // Function to generate PDF preview
  useEffect(() => {
    const generatePdfPreview = async () => {
      // Reset PDF state *before* attempting generation for the current resolvedUrl
      setPdfLoading(true);
      setPdfError(null);
      setPdfPreviewUrl(null);
      // We clear attempted only when starting a new generation attempt based on resolvedUrl
      attemptedUrls.current.clear(); 

      console.log(`[ATTACHMENT_THUMBNAIL] Generating PDF preview. Attachment ID: ${attachment?.id}, Resolved URL: ${resolvedUrl}`);
      
      // Use the state variable `resolvedUrl` which holds the validated signed URL
      if (!resolvedUrl) {
        console.warn(`[ATTACHMENT_THUMBNAIL generatePdfPreview] No resolved URL available for PDF preview. Attachment ID: ${attachment.id}`);
        setPdfError('Preview URL missing');
        return;
      }
      
      const pdfUrl = resolvedUrl;
      if (!pdfUrl || attemptedUrls.current.has(pdfUrl)) {
        return;
      }

      attemptedUrls.current.add(pdfUrl);

      try {
        console.log(`[ATTACHMENT_THUMBNAIL] Attempting to load PDF from resolved signed URL: ${pdfUrl}`);
        const loadingTask = pdfjs.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;
        
        // Get the first page
        const page = await pdf.getPage(1);

        // Set up canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          console.error('[ATTACHMENT_THUMBNAIL] Could not get canvas context');
          setPdfError('Canvas context error');
          setPdfLoading(false);
          return;
        }
        
        const viewport = page.getViewport({ scale: 1.0 });

        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render the page
        try {
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Convert canvas to data URL
          const dataUrl = canvas.toDataURL('image/png');
          setPdfPreviewUrl(dataUrl);
          console.log('[ATTACHMENT_THUMBNAIL] PDF preview generated successfully.');
        } catch (renderError) {
          console.error('[ATTACHMENT_THUMBNAIL] Error rendering PDF page:', renderError);
          setPdfError(renderError instanceof Error ? renderError.message : 'PDF render error');
        } 
      } catch (error) {
        console.error('[ATTACHMENT_THUMBNAIL] General error generating PDF preview:', error);
        setPdfError(error instanceof Error ? error.message : 'PDF loading failed');
        setPdfPreviewUrl(null); // Ensure no stale preview is shown
      } finally {
        setPdfLoading(false); // Ensure loading is always set to false
      }
    };

    // Rerun when the best URL changes or attachment details change
    if (attachment && attachment.fileType === 'application/pdf') {
      // Only run if resolvedUrl is valid
      if (resolvedUrl) {
         void generatePdfPreview();
      } else {
         // If there's no valid resolvedUrl, ensure PDF state reflects an issue
         setPdfLoading(false);
         setPdfError("Missing URL");
         setPdfPreviewUrl(null);
      }
    } else {
        // If not a PDF, ensure PDF state is reset
        setPdfLoading(false);
        setPdfError(null);
        setPdfPreviewUrl(null);
    }
  // Depend on the resolvedUrl and fileType. ID is included for clarity if attachment instance changes.
  }, [resolvedUrl, attachment?.fileType, attachment?.id]); 


  // Loading state for PDFs
  if (attachment?.fileType === 'application/pdf' && pdfLoading) {
    return (
      <div className={`${combinedClassName} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <Loader2 className="h-5 w-5 animate-spin text-[#1B4332]" />
      </div>
    );
  }

  // Image rendering
  // Prefer signedUrl for images too, if available, otherwise use resolvedUrl
  const imageUrlToUse = resolvedUrl;
  if (attachment?.fileType?.startsWith('image/') && imageUrlToUse && !imageError) {
    return (
      <div className={combinedClassName}>
        {console.log(`[ATTACHMENT_THUMBNAIL Rendering Image] Using URL: ${imageUrlToUse}`)}
        <Image
          src={imageUrlToUse} // Use the best available URL
          alt={attachment.fileName || 'Image attachment'}
          fill
          // Updated object-fit logic: contain for lg, cover otherwise
          className={`rounded-lg ${size === 'lg' ? 'object-contain' : 'object-cover'}`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={(e) => {
            console.error(`[ATTACHMENT_THUMBNAIL] Image load error for: ${imageUrlToUse}`);
            // If signedUrl failed, maybe try resolvedUrl as fallback? For now, just set error.
            setImageError(true);
          }}
        />
      </div>
    );
  }
  
  // Handle image load error state
  if (attachment?.fileType?.startsWith('image/') && (imageError || !imageUrlToUse)) {
      return (
        <div className={`${combinedClassName} bg-gray-100 rounded-lg flex flex-col items-center justify-center p-2 text-center`}>
          <ImageOff className="w-1/3 h-1/3 text-gray-400 mb-1" />
          <p className="text-xs text-gray-500">{!imageUrlToUse ? 'Missing URL' : 'Load Error'}</p>
        </div>
      );
  }

  // PDF Preview rendering - THIS IS WHERE THE PREVIEW IMAGE SHOULD RENDER
  if (attachment?.fileType === 'application/pdf' && pdfPreviewUrl && !pdfError) {
    return (
      <div className={combinedClassName}> 
        <Image
          src={pdfPreviewUrl} // Use the generated Data URL
          alt={attachment.fileName || 'PDF document preview'}
          fill
          className={`rounded-lg ${size === 'lg' ? 'object-contain' : 'object-cover'}`} // Use contain for lg size previews
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => {
            console.warn('[ATTACHMENT_THUMBNAIL] Error loading PDF preview image (Data URL).');
            setPdfError('Preview render failed'); // Set error message
            setPdfPreviewUrl(null);
          }}
        />
      </div>
    );
  }

  // PDF error state (or no signed URL, or preview generation failed)
  if (attachment?.fileType === 'application/pdf' && (!resolvedUrl || pdfError)) {
    return (
      <div className={`${combinedClassName} bg-gray-100 rounded-lg flex flex-col items-center justify-center p-2 text-center`}>
        <FileWarning className="w-1/3 h-1/3 text-orange-400 mb-1" />
        <p className="text-xs text-gray-500">{!resolvedUrl ? 'Missing URL' : pdfError || 'Load Error'}</p>
      </div>
    );
  }

  // Fallback for other file types or if no URL (signed or resolved)
  if (!resolvedUrl && attachment?.fileType) {
     return (
        <div className={`${combinedClassName} bg-gray-100 rounded-lg flex flex-col items-center justify-center p-2 text-center`}>
          <FileWarning className="w-1/3 h-1/3 text-orange-400 mb-1" />
           <p className="text-xs text-gray-500">Missing URL</p>
        </div>
      );
  }
  
  // Generic file icon for non-image/non-pdf types with a valid URL
  if (resolvedUrl) {
      return (
        <div className={`${combinedClassName} bg-gray-100 rounded-lg flex items-center justify-center`}>
          <FileIcon className="w-1/3 h-1/3 text-gray-400" />
        </div>
      );
  }

  // Absolute fallback if attachment data is incomplete/missing
  return (
     <div className={`${combinedClassName} bg-gray-100 rounded-lg flex flex-col items-center justify-center p-2 text-center`}>
       <FileWarning className="w-1/3 h-1/3 text-gray-400 mb-1" />
       <p className="text-xs text-gray-500">Invalid Data</p>
     </div>
  );
}