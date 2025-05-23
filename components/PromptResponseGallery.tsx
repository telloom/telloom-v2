/**
 * File: components/PromptResponseGallery.tsx
 * Description: A gallery component for displaying and managing prompt response attachments.
 * Features include image/file preview, navigation between attachments, metadata editing (description, dates),
 * person tag display, and file download capabilities. Handles signed URLs and loading states for secure
 * file access through Supabase storage.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Tag, Calendar, FileText, ImageOff, Download, Edit2, PlusCircle, Loader2, Trash2, Check, Edit, FileWarning } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import NextImage from 'next/image';
import AttachmentThumbnail from '@/components/AttachmentThumbnail';
import { PersonRelation, PersonTag, PromptResponseAttachmentPersonTag as PromptResponseAttachmentPersonTagType } from '@/types/models';
import { deleteAttachment } from '@/components/prompt-response-section/prompt-response-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PromptResponseGalleryProps {
  promptResponseId: string;
  galleryKey: number;
}

interface Attachment {
  id: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  title: string | null;
  description: string | null;
  dateCaptured: string | null;
  yearCaptured: number | null;
  PersonTags: PersonTag[];
  signedUrl?: string;
  profileSharerId: string;
}

export function PromptResponseGallery({ promptResponseId, galleryKey }: PromptResponseGalleryProps) {
  const supabase = createClient();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<Attachment | null>(null);

  const [currentSignedUrl, setCurrentSignedUrl] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState(true);
  const [isAddingNewTag, setIsAddingNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagRelation, setNewTagRelation] = useState<PersonRelation | ''>('');
  const [existingTags, setExistingTags] = useState<PersonTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<PersonTag[]>([]);
  const [profileSharerId, setProfileSharerId] = useState<string | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchAllData = async () => {
      console.log('GALLERY: Fetching attachments for promptResponseId:', promptResponseId);
      setLoading(true);
      setError(null);
      setImageErrors({});

      try {
        const { data, error } = await supabase
          .from('PromptResponseAttachment')
          .select(`
            id,
            fileUrl,
            fileType,
            fileName,
            title,
            description,
            dateCaptured,
            yearCaptured,
            profileSharerId,
            PromptResponseAttachmentPersonTag (
              PersonTag (
                id,
                name,
                relation,
                profileSharerId
              )
            )
          `)
          .eq('promptResponseId', promptResponseId);

        if (!mounted) return;

        if (error) {
          console.error('GALLERY: Error fetching attachments:', error);
          setError('Failed to load attachments.');
          setLoading(false);
          return;
        }

        console.log('GALLERY: Successfully fetched raw attachments:', data);

        const processedAttachments: Attachment[] = (data || []).map((item: any): Attachment => {
          const flatPersonTags: PersonTag[] = (item.PromptResponseAttachmentPersonTag || [])
            .map((tagLink: any) => tagLink.PersonTag)
            .filter((tag: PersonTag | null): tag is PersonTag => tag !== null);

          if (!profileSharerId && item.profileSharerId && mounted) {
             setProfileSharerId(item.profileSharerId);
             console.log("GALLERY: Set profileSharerId from attachment:", item.profileSharerId);
          }

          return {
            id: item.id,
            fileUrl: item.fileUrl,
            fileType: item.fileType,
            fileName: item.fileName,
            title: item.title ?? null,
            description: item.description ?? null,
            dateCaptured: item.dateCaptured ?? null,
            yearCaptured: item.yearCaptured ?? null,
            PersonTags: flatPersonTags,
            signedUrl: undefined,
            profileSharerId: item.profileSharerId,
          };
        }).filter(att => att.profileSharerId);

        if (processedAttachments.length === 0 && data?.length > 0) {
             console.warn("GALLERY: All fetched attachments were missing profileSharerId.");
        }

        console.log('GALLERY: Processed attachments with flat tags:', processedAttachments);

        const urlPromises = processedAttachments.map(async (attachment) => {
          try {
            const filePath = attachment.fileUrl.includes('attachments/')
              ? attachment.fileUrl.split('attachments/')[1]
              : attachment.fileUrl;

            const { data: signedUrlData, error: signedUrlError } = await supabase
              .storage
              .from('attachments')
              .createSignedUrl(filePath, 3600);

            if (signedUrlError) throw signedUrlError;
            return { ...attachment, signedUrl: signedUrlData?.signedUrl };
          } catch (urlError) {
            console.error('GALLERY: Error getting signed URL for:', attachment.fileUrl, urlError);
            setImageErrors(prev => ({ ...prev, [attachment.id]: true }));
            return { ...attachment, signedUrl: undefined };
          }
        });

        const attachmentsWithUrls = await Promise.all(urlPromises);
        console.log('GALLERY: Final attachments with URLs:', attachmentsWithUrls);
        if (mounted) {
             setAttachments(attachmentsWithUrls);
        }

        const currentSharerId = profileSharerId || processedAttachments[0]?.profileSharerId;
        if (currentSharerId) {
            console.log("GALLERY: Fetching existing tags for sharer:", currentSharerId);
            const { data: tags, error: tagsError } = await supabase
              .from('PersonTag')
              .select('*')
              .eq('profileSharerId', currentSharerId);

            if (!mounted) return;

            if (tagsError) {
                console.error('GALLERY: Error fetching PersonTags:', tagsError);
                toast.error('Failed to load existing tags');
            } else if (tags) {
                console.log("GALLERY: Fetched existing tags:", tags);
                setExistingTags(tags);
            }
        } else {
             console.warn("GALLERY: Cannot fetch existing tags, profileSharerId is still null.");
        }

      } catch (fetchError) {
        console.error('GALLERY: Unexpected error in fetchAllData:', fetchError);
         if (mounted) {
             setError('An unexpected error occurred.');
         }
      } finally {
        if (mounted) {
          setLoading(false);
          setIsUrlLoading(false);
        }
      }
    };

    fetchAllData();

    return () => {
      mounted = false;
      console.log("GALLERY: Unmounting, fetch cleanup.");
    };
  }, [promptResponseId, galleryKey, supabase, profileSharerId]);

  useEffect(() => {
    if (selectedIndex !== null && attachments[selectedIndex]) {
      const currentAttachment = attachments[selectedIndex];
      console.log("GALLERY: selectedIndex changed, setting editingAttachment:", currentAttachment);
      setEditingAttachment({ ...currentAttachment });
      setSelectedTags([...currentAttachment.PersonTags]);
      setCurrentSignedUrl(currentAttachment.signedUrl ?? null);
      setIsEditing(false);
      setError(null);
      setIsUrlLoading(!currentAttachment.signedUrl);
    } else {
      console.log("GALLERY: selectedIndex is null or attachment not found, resetting editing state.");
      setEditingAttachment(null);
      setSelectedTags([]);
      setCurrentSignedUrl(null);
      setIsEditing(false);
    }
  }, [selectedIndex, attachments]);

  const handleImageError = useCallback((attachmentId: string) => {
    console.log('GALLERY: Image failed to load:', attachmentId);
    setImageErrors(prev => ({ ...prev, [attachmentId]: true }));
  }, []);

  const handleAttachmentClick = useCallback((attachment: Attachment) => {
    const index = attachments.findIndex(a => a.id === attachment.id);
    console.log(`GALLERY: Thumbnail clicked. Index: ${index}, Attachment ID: ${attachment.id}`);
    setSelectedIndex(index);
  }, [attachments]);

  const handlePrevious = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
       console.log("GALLERY: Navigating previous.");
       setSelectedIndex(selectedIndex - 1);
    }
  }, [selectedIndex]);

  const handleNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < attachments.length - 1) {
      console.log("GALLERY: Navigating next.");
      setSelectedIndex(selectedIndex + 1);
    }
  }, [selectedIndex, attachments.length]);

  const handleSaveEdit = useCallback(async () => {
     if (!editingAttachment || !profileSharerId) {
          toast.error("Cannot save, attachment data or sharer context missing.");
          return;
     }
     console.log("GALLERY: handleSaveEdit called. Data to save:", editingAttachment, "Selected tags:", selectedTags);
     setLoading(true); // Indicate saving process

     try {
          // 1. Update Attachment Metadata
          const { error: updateError } = await supabase
              .from('PromptResponseAttachment')
              .update({
                  description: editingAttachment.description,
                  dateCaptured: editingAttachment.dateCaptured,
                  yearCaptured: editingAttachment.yearCaptured
              })
              .eq('id', editingAttachment.id);

          if (updateError) {
              console.error("GALLERY: Error updating attachment metadata:", updateError);
              throw new Error(`Failed to update attachment details: ${updateError.message}`);
          }
          console.log("GALLERY: Successfully updated attachment metadata for ID:", editingAttachment.id);

          // 2. Manage Tag Relationships
          const originalAttachment = attachments[selectedIndex!]; // Get the original state before edits
          const originalTagIds = new Set(originalAttachment.PersonTags.map(tag => tag.id));
          const currentTagIds = new Set(selectedTags.map(tag => tag.id));

          const tagsToAdd = selectedTags.filter(tag => !originalTagIds.has(tag.id));
          const tagsToRemove = originalAttachment.PersonTags.filter(tag => !currentTagIds.has(tag.id));

          console.log("GALLERY: Tags to add:", tagsToAdd.map(t=>t.id));
          console.log("GALLERY: Tags to remove:", tagsToRemove.map(t=>t.id));

          // Add new tags
          if (tagsToAdd.length > 0) {
              const newLinks = tagsToAdd.map(tag => ({
                  promptResponseAttachmentId: editingAttachment.id,
                  personTagId: tag.id
              }));
              const { error: insertError } = await supabase
                  .from('PromptResponseAttachmentPersonTag')
                  .insert(newLinks);

              if (insertError) {
                  console.error("GALLERY: Error inserting new tag links:", insertError);
                  // Consider rolling back or notifying user of partial success
                  throw new Error(`Failed to add new tags: ${insertError.message}`);
              }
               console.log("GALLERY: Successfully added new tag links.");
          }

          // Remove old tags
          if (tagsToRemove.length > 0) {
              const tagIdsToRemove = tagsToRemove.map(tag => tag.id);
              const { error: deleteError } = await supabase
                  .from('PromptResponseAttachmentPersonTag')
                  .delete()
                  .eq('promptResponseAttachmentId', editingAttachment.id)
                  .in('personTagId', tagIdsToRemove);

              if (deleteError) {
                  console.error("GALLERY: Error deleting old tag links:", deleteError);
                  // Consider rolling back or notifying user of partial success
                   throw new Error(`Failed to remove old tags: ${deleteError.message}`);
              }
               console.log("GALLERY: Successfully removed old tag links.");
          }

          // Update local state after successful save
          const updatedAttachments = attachments.map(att =>
              att.id === editingAttachment.id
                ? { ...editingAttachment, PersonTags: selectedTags } // Use the final selectedTags state
                : att
          );
          setAttachments(updatedAttachments);
          setIsEditing(false);
          toast.success("Attachment details saved successfully!");

     } catch (error: any) {
          console.error("GALLERY: Error during save process:", error);
          toast.error(error.message || "Failed to save changes.");
     } finally {
          setLoading(false); // End loading state regardless of outcome
     }

  }, [editingAttachment, selectedTags, attachments, profileSharerId, supabase, selectedIndex]); // Added selectedIndex dependency

  const handleEdit = useCallback(() => {
     if (selectedIndex !== null) {
         console.log("GALLERY: Edit button clicked.");
         setIsEditing(true);
     }
  }, [selectedIndex]);

  const handleDownload = useCallback(async (attachmentId: string, fileName: string, url?: string | null) => {
    console.log('GALLERY: Initiating fetch download for', fileName, 'with URL:', url);
    if (!url) {
      toast.error('Download failed', { description: 'No valid download URL available.' });
      return;
    }

    toast.info(`Preparing ${fileName} for download...`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file (${response.status} ${response.statusText})`);
      }
      const blob = await response.blob();

      // Create an object URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();

      // Clean up the object URL and link
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`Download started for ${fileName}.`);
    } catch (error: any) {
      console.error('GALLERY: Error downloading file:', error);
      toast.error('Download failed', { description: error.message || 'Could not retrieve file.' });
    }
  }, []);

  const handleDeleteClick = useCallback((attachmentId: string) => {
    const attachment = attachments.find(att => att.id === attachmentId);
    if (attachment) {
      setAttachmentToDelete(attachment);
    }
  }, [attachments]);

  const confirmDelete = async () => {
    if (!attachmentToDelete) return;

    setIsDeleting(true);
    const formData = new FormData();
    formData.append('attachmentId', attachmentToDelete.id);

    try {
      const result = await deleteAttachment(formData);

      if (result.success) {
        toast.success(`Attachment \"${attachmentToDelete.fileName}\" deleted.`);
        setAttachments(prev => prev.filter(att => att.id !== attachmentToDelete!.id));
        // If the deleted item was selected in the dialog, close the dialog
        if (selectedIndex !== null && attachments[selectedIndex]?.id === attachmentToDelete.id) {
          setSelectedIndex(null);
        }
      } else {
        throw new Error(result.error || 'Failed to delete attachment.');
      }
    } catch (err: any) {
      console.error('GALLERY: Error deleting attachment:', err);
      toast.error('Deletion failed', { description: err.message });
    } finally {
      setIsDeleting(false);
      setAttachmentToDelete(null); // Close confirmation dialog
    }
  };

  const handleAddNewTag = useCallback(async () => {
    if (!newTagName || !newTagRelation || !profileSharerId) {
      toast.error("Missing name, relation, or sharer context for new tag.");
      return;
    }
    console.log("GALLERY: Adding new tag:", { name: newTagName, relation: newTagRelation });
    const tempId = `temp-${Date.now()}`;
    const optimisticTag: PersonTag = {
        id: tempId,
        name: newTagName,
        relation: newTagRelation,
        profileSharerId,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    setSelectedTags(prev => [...prev, optimisticTag]);
    setExistingTags(prev => [...prev, optimisticTag]);
    setNewTagName('');
    setNewTagRelation('');
    setIsAddingNewTag(false);

    try {
      const { data: newTag, error } = await supabase
        .from('PersonTag')
        .insert({ name: newTagName, relation: newTagRelation, profileSharerId })
        .select()
        .single();

      if (error) throw error;

      if (newTag) {
          console.log("GALLERY: Successfully added tag to DB:", newTag);
          setSelectedTags(prev => prev.map(t => t.id === tempId ? newTag : t));
          setExistingTags(prev => prev.map(t => t.id === tempId ? newTag : t));
          toast.success(`Tag "${newTag.name}" created.`);
      }
    } catch (error) {
       console.error("GALLERY: Error adding new tag to DB:", error);
       toast.error("Failed to create tag.");
       setSelectedTags(prev => prev.filter(t => t.id !== tempId));
       setExistingTags(prev => prev.filter(t => t.id !== tempId));
    }
  }, [newTagName, newTagRelation, profileSharerId, supabase]);

  // Function to remove a tag locally before saving
  const removeTag = useCallback((tagId: string) => {
    console.log("GALLERY: Removing tag locally:", tagId);
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagId));
  }, []);

  if (loading && attachments.length === 0) {
    return <div className="w-full h-32 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  if (error && attachments.length === 0) {
     return <div className="w-full h-32 flex items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 gap-2 md:gap-4">
        {attachments.map((attachment, index) => (
          <AttachmentThumbnail
            key={`${galleryKey}-${attachment.id}`}
            attachment={attachment}
            size="lg"
            onClick={() => handleAttachmentClick(attachment)}
            onError={() => handleImageError(attachment.id)}
            imageError={imageErrors[attachment.id]}
            onDownload={handleDownload}
            onDelete={handleDeleteClick}
          />
        ))}
      </div>

      <Dialog open={selectedIndex !== null} onOpenChange={(isOpen) => {
        if (!isOpen) {
             setSelectedIndex(null);
             setIsEditing(false);
        }
      }}>
        <DialogContent
          className="max-w-[95vw] md:max-w-4xl h-[90vh] flex flex-col p-4 md:p-6 mx-auto overflow-y-auto"
          aria-describedby="attachment-details-description"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>View Attachment</DialogTitle>
            <DialogDescription id="attachment-details-description">
              View and edit details for the selected attachment.
            </DialogDescription>
          </DialogHeader>

           {/* Close Button (Top Right) - Adjust size and rounding */}
           <button
              type="button"
              onClick={() => setSelectedIndex(null)} // Use state setter to close
              className="absolute top-4 right-4 z-20 h-8 w-8 inline-flex items-center justify-center rounded-full bg-white hover:bg-gray-100 text-gray-700"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>

          {/* Main Content Grid */}
          <div className="flex flex-col lg:grid lg:grid-cols-[3fr_1fr] h-full">

            {/* Left Side - Image/PDF Preview */}
            <div className="w-full lg:h-full flex flex-col">
              {/* Content Container */}
              <div className="relative bg-gray-100 w-full h-[75vh] lg:h-[78vh] overflow-hidden">
                {/* Loading State */}
                {(isUrlLoading || (loading && !attachments[selectedIndex!]?.signedUrl)) ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                /* Error State */
                ) : error || (selectedIndex !== null && imageErrors[attachments[selectedIndex]?.id]) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <FileWarning className="h-12 w-12 text-red-400 mb-2" />
                    <p className="text-sm text-red-500">{error || 'Preview failed to load'}</p>
                  </div>
                /* Image Display - Fix non-null assertions */
                ) : selectedIndex !== null && attachments[selectedIndex]?.fileType.startsWith("image/") && attachments[selectedIndex]?.signedUrl ? (
                  <div className="w-full h-full relative">
                    <NextImage
                      src={attachments[selectedIndex].signedUrl!}
                      alt={editingAttachment?.title || editingAttachment?.fileName || "Attachment Image"}
                      fill
                      className={`object-contain transition-opacity duration-300`}
                      sizes="(max-width: 768px) 90vw, 45vw"
                      onError={() => selectedIndex !== null && handleImageError(attachments[selectedIndex].id)}
                    />
                  </div>
                /* PDF Display - Fix non-null assertions */
                ) : selectedIndex !== null && attachments[selectedIndex]?.fileType === 'application/pdf' && attachments[selectedIndex]?.signedUrl ? (
                  <iframe
                    src={attachments[selectedIndex].signedUrl!}
                    title={editingAttachment?.fileName || "PDF Document"}
                    className="w-full h-full border-0"
                  />
                /* Fallback Thumbnail */
                ) : selectedIndex !== null ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                      <FileText className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Preview not available for this file type.</p>
                    </div>
                /* No Selection Fallback */
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                     <FileWarning className="h-12 w-12 text-gray-400 mb-2" />
                     <p className="text-sm text-gray-500">No attachment data</p>
                  </div>
                )}
              </div>

              {/* Navigation & Action Buttons - Single row, icons only on mobile */}
              <div className="flex flex-row items-center gap-2 p-4 bg-white border-t lg:border-b-0">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={selectedIndex === null || selectedIndex <= 0 || loading}
                    className="rounded-full flex-1 md:flex-initial justify-center" 
                    aria-label="Previous attachment"
                  >
                    <ChevronLeft className="h-4 w-4 md:mr-2" /> 
                    <span className="hidden md:inline">Previous</span>
                  </Button>
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={selectedIndex === null || selectedIndex >= attachments.length - 1 || loading}
                    className="rounded-full flex-1 md:flex-initial justify-center"
                    aria-label="Next attachment"
                  >
                    <span className="hidden md:inline">Next</span>
                    <ChevronRight className="h-4 w-4 md:ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachments[selectedIndex!].id, attachments[selectedIndex!].fileName, attachments[selectedIndex!].signedUrl)}
                    disabled={selectedIndex === null || !attachments[selectedIndex]?.signedUrl}
                    className="rounded-full flex-1 md:flex-initial justify-center"
                    aria-label="Download attachment"
                  >
                    <Download className="h-4 w-4 md:mr-2" /> 
                    <span className="hidden md:inline">Download</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(attachments[selectedIndex!].id)}
                    disabled={selectedIndex === null}
                    className="rounded-full text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 flex-1 md:flex-initial justify-center"
                    aria-label="Delete attachment"
                  >
                    <Trash2 className="h-4 w-4 md:mr-2" /> 
                    <span className="hidden md:inline">Delete</span>
                  </Button>
              </div>
            </div>

            {/* Right Side - Metadata */}
            <div className="w-full lg:h-[calc(100vh-8rem)] lg:border-l flex flex-col">
              {/* Metadata Header - Add top padding */}
              <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b lg:sticky lg:top-0 lg:z-10 bg-white">
                <h3 className="font-medium">Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isEditing) {
                      handleSaveEdit(); // Use the gallery's save handler
                    } else {
                      handleEdit(); // Use the gallery's edit handler
                    }
                  }}
                  disabled={loading || selectedIndex === null} // Disable if loading or no selection
                  className="rounded-full"
                >
                  {loading && isEditing ? (
                    <> <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving... </>
                  ) : isEditing ? (
                    <> <Check className="h-4 w-4 mr-2" /> Save </>
                  ) : (
                    <> <Edit className="h-4 w-4 mr-2" /> Edit </>
                  )}
                </Button>
              </div>

              {/* Scrollable Metadata Content */}
              <div className="p-4 space-y-6 lg:overflow-y-auto lg:flex-1">
                {selectedIndex === null || !editingAttachment ? (
                  <p className='text-muted-foreground text-sm'>Select an attachment to view details.</p>
                ) : (
                  <>
                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="attachment-description">Description</Label>
                      <Textarea
                        id="attachment-description"
                        value={editingAttachment.description || ''}
                        onChange={(e) => setEditingAttachment(prev => prev ? { ...prev, description: e.target.value } : null)}
                        disabled={!isEditing}
                        rows={4}
                        tabIndex={isEditing ? 0 : -1}
                      />
                    </div>

                    {/* Date/Year */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label htmlFor="attachment-date">Exact Date</Label>
                          <p className="text-xs text-muted-foreground">If you know the specific date</p>
                        </div>
                        <Input
                          id="attachment-date"
                          type="date"
                          value={formatDateForInput(editingAttachment.dateCaptured)} // Use helper to format
                          onChange={(e) => setEditingAttachment(prev => prev ? { ...prev, dateCaptured: e.target.value || null } : null)}
                          disabled={!isEditing}
                          className="[color-scheme:light]"
                          tabIndex={isEditing ? 0 : -1}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label htmlFor="attachment-year">Year Only</Label>
                          <p className="text-xs text-muted-foreground">If you only remember the year</p>
                        </div>
                        <Input
                          id="attachment-year"
                          type="number"
                          min="1800"
                          max={new Date().getFullYear()}
                          value={editingAttachment.yearCaptured?.toString() || ''}
                          onChange={(e) => setEditingAttachment(prev => prev ? { ...prev, yearCaptured: e.target.value ? parseInt(e.target.value) : null } : null)}
                          disabled={!isEditing}
                          placeholder="e.g., 1999"
                          tabIndex={isEditing ? 0 : -1}
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <Label id="people-label">People</Label>
                      {isEditing && (
                        <div className="mt-2">
                          <Select
                            value=""
                            onValueChange={(value: string) => {
                              if (value === 'add-new') {
                                setIsAddingNewTag(true);
                                return;
                              }
                              const tag = existingTags.find(t => t.id === value);
                              if (tag && !selectedTags.some(t => t.id === tag.id)) {
                                setSelectedTags(prev => [...prev, tag]);
                              }
                            }}
                            aria-labelledby="people-label"
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Add people..." />
                            </SelectTrigger>
                            <SelectContent>
                              {existingTags.map((tag) => (
                                <SelectItem key={tag.id} value={tag.id}>
                                  <div className="flex items-center"> <Tag className="mr-2 h-4 w-4" /> {tag.name} ({tag.relation}) </div>
                                </SelectItem>
                              ))}
                              <SelectItem value="add-new">
                                <div className="flex items-center text-[#1B4332]"> <PlusCircle className="mr-2 h-4 w-4" /> Add new person </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {/* Display Selected Tags */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedTags.map(tag => (
                          <Badge key={tag.id} variant={isEditing ? "default" : "secondary"} className={isEditing ? "cursor-pointer" : undefined}>
                            <Tag className="h-3 w-3 mr-1" /> {tag.name} ({tag.relation})
                            {isEditing && (
                              <X className="h-3 w-3 ml-1" onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }} />
                            )}
                          </Badge>
                        ))}
                        {selectedTags.length === 0 && (
                          <span className="text-sm text-gray-500">No people tagged</span>
                        )}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="pt-4 border-t">
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>File name: {editingAttachment.fileName}</p>
                        <p>File type: {editingAttachment.fileType}</p>
                         <p>ID: {editingAttachment.id}</p> {/* Added for debugging */} 
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>

        {/* Inner Dialog for Adding New Tag */}
        <Dialog open={isAddingNewTag} onOpenChange={(open) => !open && setIsAddingNewTag(false)}>
           <DialogContent className="max-w-md" aria-describedby="new-tag-dialog-description">
              <DialogHeader>
                 <DialogTitle>Add New Person</DialogTitle>
                 <DialogDescription id="new-tag-dialog-description">Add a new person to tag in your attachments.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                 <div>
                    <Label htmlFor="new-tag-name">Name</Label>
                    <Input id="new-tag-name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} className="mt-2" />
                 </div>
                 <div>
                    <Label htmlFor="new-tag-relation">Relationship</Label>
                    <Select value={newTagRelation} onValueChange={(value) => setNewTagRelation(value as PersonRelation)}>
                       <SelectTrigger className="mt-2"><SelectValue placeholder="Select relationship" /></SelectTrigger>
                       <SelectContent>
                          {Object.values(PersonRelation).map((relation) => (
                             <SelectItem key={relation} value={relation}>{relation}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingNewTag(false)} className="rounded-full">Cancel</Button>
                    <Button size="sm" onClick={handleAddNewTag} disabled={!newTagName || !newTagRelation} className="rounded-full">Add</Button>
                 </div>
              </div>
           </DialogContent>
        </Dialog>

        {/* Deletion Confirmation Dialog */}
        <AlertDialog open={!!attachmentToDelete} onOpenChange={() => setAttachmentToDelete(null)}> 
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the attachment
                <span className="font-semibold"> {attachmentToDelete?.fileName}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="rounded-full">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault(); // Prevent closing dialog immediately
                  void confirmDelete();
                }}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 rounded-full"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isDeleting ? 'Deleting...' : 'Yes, delete it'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Dialog>
    </>
  );
}

function formatDateForInput(dateString: string | null): string {
  // Handle null or empty string input
  if (!dateString) return '';

  try {
    // Only attempt to parse if it's a non-empty string
    const date = new Date(dateString);

    // Check if parsing resulted in a valid date
    if (isNaN(date.getTime())) {
      console.warn("GALLERY: Invalid date string received for formatting:", dateString);
      // Check if it might already be in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
         return dateString; // Assume correct format
      }
      return ''; // Invalid date
    }

    // Use UTC methods to avoid timezone issues when formatting date-only input
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("GALLERY: Error formatting date string:", dateString, e);
    return ''; // Return empty string on error
  }
} 