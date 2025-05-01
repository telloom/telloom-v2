// components/AttachmentThumbnail.tsx
// This component displays a thumbnail for an attachment, including handling signed URLs and loading states.
'use client';

import { ThumbnailAttachment as ImportedThumbnailAttachment } from '@/types/component-interfaces';
import Image from 'next/image';
import { FileIcon, ImageOff, FileWarning, Loader2, Download, Trash2 } from 'lucide-react'; // Changed DownloadCloud to Download
import { useEffect, useState, useMemo, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Added Button
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Added Tooltip components

// Set worker path to minified version without source maps
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Define a local interface compatible with the data source
interface AttachmentThumbnailProps {
  attachment: {
    id: string; // Used directly now
    signedUrl?: string | null;
    fileName: string;
    fileType?: string | null;
    dateCaptured?: Date | null; // Changed back to Date | null
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void; // Kept for opening the dialog
  onError?: () => void;
  imageError?: boolean;
  // Add new props for actions
  onDownload?: (attachmentId: string, fileName: string, url?: string | null) => void; // Made optional
  onDelete?: (attachmentId: string) => void; // Made optional
}

const sizeClasses = {
  sm: 'h-24 w-24',
  md: 'h-32 w-32',
  lg: 'aspect-square'
};

export default function AttachmentThumbnail({
  attachment,
  size = 'md',
  className = '',
  onClick,
  onError,
  imageError: propImageError,
  onDownload, // Destructure new props
  onDelete
}: AttachmentThumbnailProps) {
  // console.log('[ATTACHMENT_THUMBNAIL] Received props:', { attachment, size, className, onClick: !!onClick, onError: !!onError, imageError: propImageError });

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
  // Use a div as the base container, the button inside handles the main click
  // Add 'group' class for hover detection
  const combinedClassName = cn(
      'relative group bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center',
      sizeClass,
      className
  );


  // Resolve and validate the primary URL for display
  useEffect(() => {
    const urlToUse = attachment?.signedUrl;
    let isValidUrl = false;

    // console.log(`[ATTACHMENT_THUMBNAIL useEffect URL Resolution] Received signedUrl prop: ${urlToUse} for attachment ID: ${attachment?.id}`);

    if (urlToUse && typeof urlToUse === 'string' && urlToUse.startsWith('http')) {
      try {
        const validUrl = new URL(urlToUse);
        setResolvedUrl(validUrl.toString());
        isValidUrl = true;
        // console.log(`[ATTACHMENT_THUMBNAIL] Resolved URL set to: ${validUrl.toString()}`);
      } catch (error) {
        console.error('[ATTACHMENT_THUMBNAIL] Invalid signed URL structure found:', urlToUse, error);
      }
    }

    if (!isValidUrl) {
       // console.warn('[ATTACHMENT_THUMBNAIL] No valid signedUrl provided or URL invalid for attachment:', attachment?.id);
       setResolvedUrl(null);
    }
    setImageError(false);
  }, [attachment?.signedUrl, attachment?.id]);

  // Function to generate PDF preview
  useEffect(() => {
    const generatePdfPreview = async () => {
      setPdfLoading(true);
      setPdfError(null);
      setPdfPreviewUrl(null);
      attemptedUrls.current.clear();

      // console.log(`[ATTACHMENT_THUMBNAIL] Generating PDF preview. Attachment ID: ${attachment?.id}, Resolved URL: ${resolvedUrl}`);

      if (!resolvedUrl) {
        // console.warn(`[ATTACHMENT_THUMBNAIL generatePdfPreview] No resolved URL available for PDF preview. Attachment ID: ${attachment.id}`);
        setPdfError('Preview URL missing');
        setPdfLoading(false); // Set loading false here
        return;
      }

      const pdfUrl = resolvedUrl;
      if (!pdfUrl || attemptedUrls.current.has(pdfUrl)) {
        setPdfLoading(false); // Set loading false if URL invalid or already attempted
        return;
      }

      attemptedUrls.current.add(pdfUrl);

      try {
        // console.log(`[ATTACHMENT_THUMBNAIL] Attempting to load PDF from resolved signed URL: ${pdfUrl}`);
        const loadingTask = pdfjs.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          console.error('[ATTACHMENT_THUMBNAIL] Could not get canvas context');
          setPdfError('Canvas context error');
          setPdfLoading(false);
          return;
        }

        const viewport = page.getViewport({ scale: 1.0 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        try {
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          const dataUrl = canvas.toDataURL('image/png');
          setPdfPreviewUrl(dataUrl);
          // console.log('[ATTACHMENT_THUMBNAIL] PDF preview generated successfully.');
        } catch (renderError) {
          console.error('[ATTACHMENT_THUMBNAIL] Error rendering PDF page:', renderError);
          setPdfError(renderError instanceof Error ? renderError.message : 'PDF render error');
        }
      } catch (error) {
        console.error('[ATTACHMENT_THUMBNAIL] General error generating PDF preview:', error);
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


  // Loading state for PDFs
  if (attachment?.fileType === 'application/pdf' && pdfLoading) {
    return (
      <div className={combinedClassName}> {/* Use div as wrapper */}
        <Loader2 className="h-5 w-5 animate-spin text-[#1B4332]" />
      </div>
    );
  }

  // Error state for PDF generation or general invalid URL
  if ((attachment?.fileType === 'application/pdf' && pdfError) || !resolvedUrl) {
    return (
      <div className={combinedClassName} onClick={onClick} role="button" tabIndex={0} aria-label={`View details for ${attachment.fileName}`}> 
        <div className="text-center text-xs text-red-600 p-2">
          <FileWarning className="h-5 w-5 mx-auto mb-1" />
          Preview<br/>Unavailable
        </div>
         {/* Add conditional rendering for icons */}
         {onDownload && onDelete && (
           <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
             <TooltipProvider delayDuration={100}>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-6 w-6 rounded-full bg-black/50 text-white hover:bg-[#8fbc55] p-1"
                     onClick={(e) => { e.stopPropagation(); onDownload?.(attachment.id, attachment.fileName, resolvedUrl); }}
                   >
                     <Download className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent side="top"><p>Download</p></TooltipContent>
               </Tooltip>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-6 w-6 rounded-full bg-black/50 text-white hover:bg-red-500/80 p-1"
                     onClick={(e) => { e.stopPropagation(); onDelete?.(attachment.id); }}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent side="top"><p>Delete</p></TooltipContent>
               </Tooltip>
             </TooltipProvider>
           </div>
         )}
      </div>
    );
  }


  // Image Error state (only if it's an image type)
  const isImage = attachment?.fileType?.startsWith('image/');
  if (imageError && isImage) {
    return (
      <div className={combinedClassName} onClick={onClick} role="button" tabIndex={0} aria-label={`View details for ${attachment.fileName}`}> 
        <div className="text-center text-xs text-muted-foreground p-2">
          <ImageOff className="h-5 w-5 mx-auto mb-1" />
          Image<br/>Not Found
        </div>
         {/* Add conditional rendering for icons */}
         {onDownload && onDelete && (
           <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
             <TooltipProvider delayDuration={100}>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-6 w-6 rounded-full bg-black/50 text-white hover:bg-[#8fbc55] p-1"
                     onClick={(e) => { e.stopPropagation(); onDownload?.(attachment.id, attachment.fileName, resolvedUrl); }}
                   >
                     <Download className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent side="top"><p>Download</p></TooltipContent>
               </Tooltip>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-6 w-6 rounded-full bg-black/50 text-white hover:bg-red-500/80 p-1"
                     onClick={(e) => { e.stopPropagation(); onDelete?.(attachment.id); }}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent side="top"><p>Delete</p></TooltipContent>
               </Tooltip>
             </TooltipProvider>
           </div>
         )}
      </div>
    );
  }

  // --- Successful Render ---
  return (
    <div className={combinedClassName} onClick={onClick} role="button" tabIndex={0} aria-label={`View details for ${attachment.fileName}`}> 
      {/* REMOVE the full-cover button -> Clickable area for opening the dialog */}
       {/* 
       <button
         type="button"
         onClick={onClick}
         className="absolute inset-0 z-0" // Cover the area but stay behind icons
         aria-label={`View details for ${attachment.fileName}`}
       />
       */}

      {isImage && resolvedUrl && (
        <Image
          src={resolvedUrl}
          alt={attachment.fileName ?? 'Attachment'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Example sizes, adjust as needed
          style={{ objectFit: 'cover' }}
          onError={() => {
            console.warn(`[ATTACHMENT_THUMBNAIL] Image load error for URL: ${resolvedUrl}`);
            setImageError(true);
            onError?.(); // Notify parent
          }}
          unoptimized={true} // Required for Supabase signed URLs
        />
      )}

      {attachment?.fileType === 'application/pdf' && pdfPreviewUrl && (
        <Image
          src={pdfPreviewUrl}
          alt={`Preview of ${attachment.fileName}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
        />
      )}

      {!isImage && attachment?.fileType !== 'application/pdf' && (
        <div className="text-center text-xs text-muted-foreground p-2">
          <FileIcon className="h-5 w-5 mx-auto mb-1" />
          {attachment.fileName.length > 15
             ? `${attachment.fileName.substring(0, 12)}...`
             : attachment.fileName
           }
        </div>
      )}

      {/* Action Icons on Hover - Add conditional rendering */}
      {onDownload && onDelete && (
        <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"> {/* Ensure icons are above the button */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full bg-black/50 text-white hover:bg-[#8fbc55] p-1"
                  onClick={(e) => { e.stopPropagation(); onDownload?.(attachment.id, attachment.fileName, resolvedUrl); }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Download</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full bg-black/50 text-white hover:bg-red-500/80 p-1"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(attachment.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Delete</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}