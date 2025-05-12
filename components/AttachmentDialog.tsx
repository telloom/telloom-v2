/**
 * File: components/AttachmentDialog.tsx
 * Description: A dialog component for viewing and editing attachment metadata including title, description,
 * date captured, year, and person tags. Supports image preview and navigation between multiple attachments.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from '@/utils/supabase/client';
import { FileText, Tag, X, Edit, Check, ChevronLeft, ChevronRight, PlusCircle, Loader2, ImageOff, Download, Trash2, FileWarning } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { PersonRelation, PersonTag, PromptResponseAttachmentPersonTag as PromptResponseAttachmentPersonTagType } from '@/types/models';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import NextImage from 'next/image';
import AttachmentThumbnail from '@/components/AttachmentThumbnail';
import { urlCache } from '@/utils/url-cache';
import { useAuth } from '@/hooks/useAuth';

// Remove the local PersonRelation constant and update the type
type PersonRelationType = PersonRelation;

export interface Attachment {
  id: string;
  fileUrl: string;
  displayUrl?: string;
  fileType: string;
  fileName: string;
  title: string | null;
  description: string | null;
  dateCaptured: Date | null;
  yearCaptured: number | null;
  PersonTags: PersonTag[];
  profileSharerId?: string;
}

interface PromptResponseAttachmentPersonTag {
  personTag: PersonTag;
}

interface AttachmentWithNestedTags extends Omit<Attachment, 'PersonTags'> {
  PersonTags: PromptResponseAttachmentPersonTagType[];
}

interface AttachmentWithTags {
  id: string;
  description: string | null;
  dateCaptured: string | null;
  yearCaptured: number | null;
  PromptResponseAttachmentPersonTag: Array<{
    PersonTag: PersonTag;
  }>;
}

interface AttachmentDialogProps {
  attachment: Attachment | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onSave?: (attachment: Attachment) => Promise<void>;
  onDelete?: (attachmentId: string) => Promise<void>;
  onDownload?: (attachment: Attachment) => Promise<void>;
}

export function AttachmentDialog({
  attachment,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onSave,
  onDelete,
  onDownload,
}: AttachmentDialogProps) {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  // Add logging for received props
  useEffect(() => {
    // console.log('[AttachmentDialog] Props Received:', { ... }); // REMOVE
  }, [isOpen, onDownload, onSave, onDelete, hasNext, hasPrevious]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<Attachment | null>(null);
  const [currentSignedUrl, setCurrentSignedUrl] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState(true);
  const [isAddingNewTag, setIsAddingNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagRelation, setNewTagRelation] = useState<PersonRelation | ''>( '');
  const [existingTags, setExistingTags] = useState<PersonTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<PersonTag[]>([]);
  const [profileSharerId, setProfileSharerId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // <<< NEW LOGGING >>>
  console.log(`[AttachmentDialog RENDER START] isOpen: ${isOpen}, Incoming attachment prop ID: ${attachment?.id}`);
  if (isOpen && attachment) {
     console.log(`[AttachmentDialog RENDER START] Incoming attachment prop details:`, JSON.stringify(attachment, null, 2));
  }

  // Reset state when attachment changes
  useEffect(() => {
    console.log(`[AttachmentDialog useEffect attachment] Running effect. Attachment prop ID: ${attachment?.id}`); // Log start
    if (attachment) {
      // <<< REMOVE LOGGING HERE >>>
      // console.log('[AttachmentDialog useEffect attachment] Running effect. Attachment ID:', attachment.id);
      // console.log('[AttachmentDialog useEffect attachment] attachment.PersonTags:', attachment.PersonTags);

      // <<< NEW LOGGING >>>
      console.log('[AttachmentDialog useEffect attachment] Prop details:', JSON.stringify(attachment, null, 2));

      setProfileSharerId(attachment.profileSharerId || null);

      const personTags = attachment.PersonTags || [];
      // <<< REMOVE LOGGING HERE >>>
      // console.log('[AttachmentDialog useEffect attachment] personTags variable before setting state:', personTags);

      // <<< NEW LOGGING >>>
      console.log('[AttachmentDialog useEffect attachment] Extracted PersonTags from prop:', JSON.stringify(personTags, null, 2));

      const safeAttachment: Attachment = {
        ...attachment,
        description: attachment.description || null,
        dateCaptured: attachment.dateCaptured || null,
        yearCaptured: attachment.yearCaptured || null,
        PersonTags: personTags
      };
      // <<< NEW LOGGING >>>
      console.log('[AttachmentDialog useEffect attachment] Setting editingAttachment state to:', JSON.stringify(safeAttachment, null, 2));
      setEditingAttachment(safeAttachment);
      // <<< NEW LOGGING >>>
      console.log('[AttachmentDialog useEffect attachment] Setting selectedTags state to:', JSON.stringify(personTags, null, 2));
      setSelectedTags(personTags);

      setIsEditing(false); // Ensure edit mode is reset when attachment changes
      // <<< NEW LOGGING >>>
      console.log('[AttachmentDialog useEffect attachment] Reset isEditing to false.');
    } else {
        console.log('[AttachmentDialog useEffect attachment] Attachment prop is null, skipping state update.');
    }
  }, [attachment]); // Keep dependency array as is

  // Fetch existing PersonTags when the relevant profileSharerId is available
  useEffect(() => {
    let mounted = true;
    async function fetchTags() {
      if (!isOpen || !profileSharerId) return;

      try {
        const { data: tags, error: tagsError } = await supabase
          .from('PersonTag')
          .select('*')
          .eq('profileSharerId', profileSharerId);

        if (tagsError) throw tagsError;
        if (mounted && tags) {
          setExistingTags(tags);
        }
      } catch (error) {
        console.error('Error fetching PersonTags:', error);
        toast.error('Failed to load existing tags');
      } finally {
        // Handle loading state if needed
      }
    }

    fetchTags();
    return () => { mounted = false; };
  }, [isOpen, profileSharerId, supabase]);

  // Optimize URL handling
  useEffect(() => {
    let isMounted = true;
    const fetchUrl = async () => {
      // Log at the beginning of the effect execution
      console.log(`[AttachmentDialog useEffect URL] Running effect. Attachment ID: ${attachment?.id}, File URL: ${attachment?.fileUrl}`);

      if (!attachment || !attachment.fileUrl) {
        console.warn('[AttachmentDialog useEffect URL] Cannot fetch URL: Attachment or fileUrl missing.');
        setCurrentSignedUrl(null);
        setIsUrlLoading(false);
        setError('Invalid file path');
        return;
      }

      setIsUrlLoading(true);
      setCurrentSignedUrl(null); // Reset previous URL

      let filePath: string | null = null;
      const originalFileUrl = attachment.fileUrl;

      // Extract file path logic (same as before)
      if (originalFileUrl && originalFileUrl.startsWith('http')) {
          try {
              const urlObject = new URL(originalFileUrl);
              const pathSegments = urlObject.pathname.split('/attachments/');
              if (pathSegments.length > 1) {
                  filePath = pathSegments[1];
              } else {
                  console.warn(`[AttachmentDialog] Could not extract path from old URL format: ${originalFileUrl}`);
              }
          } catch (e) {
              console.warn(`[AttachmentDialog] Error parsing old URL: ${originalFileUrl}`, e);
          }
      } else if (originalFileUrl) {
          filePath = originalFileUrl;
      } else {
           console.warn(`[AttachmentDialog] fileUrl is missing for attachment ${attachment.id}`);
      }

      if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
        console.error('[AttachmentDialog] Invalid file path determined, cannot fetch signed URL.');
        setCurrentSignedUrl(null);
        setIsUrlLoading(false);
        setError('Invalid file path');
        return;
      }

      try {
        // *** FIX: Use determined filePath directly as it should contain the full path ***
        const fullStoragePath = filePath; // NEW - Use determined filePath directly

        console.log(`[AttachmentDialog] Fetching signed URL for constructed path: ${fullStoragePath}`); // Existing log
        // *** ADDED LOGGING ***

        const { data, error: urlError } = await supabase.storage
          .from('attachments')
          .createSignedUrl(fullStoragePath, 3600); // 1 hour expiry

        if (!isMounted) return; // Component unmounted during fetch

        if (urlError) {
          console.error('[AttachmentDialog] Error getting signed URL:', urlError);
          setError('Failed to load preview URL');
          setCurrentSignedUrl(null);
        } else if (data?.signedUrl) {
          console.log(`[AttachmentDialog] Successfully fetched signed URL for ${fullStoragePath}`);
          setCurrentSignedUrl(data.signedUrl);
          setError(null);
        } else {
           console.warn('[AttachmentDialog] createSignedUrl returned no error but no URL.');
           setError('Could not get preview URL');
           setCurrentSignedUrl(null);
        }
      } catch (catchError) {
        console.error('[AttachmentDialog] Unexpected error in fetchUrl:', catchError);
        if (isMounted) {
             setError('Error loading preview');
             setCurrentSignedUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsUrlLoading(false);
        }
      }
    };

    fetchUrl();

    return () => {
      console.log(`[AttachmentDialog useEffect URL] Cleanup effect. Attachment ID was: ${attachment?.id}`);
      isMounted = false;
    };
  }, [attachment?.id, attachment?.fileUrl, supabase, profileSharerId]); // Keep dependencies

  const removeTag = useCallback((tagId: string) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagId));
  }, []);

  const handleAddNewTag = async () => {
    if (!newTagName || !newTagRelation || !profileSharerId) {
      toast.error("Missing name, relation, or sharer context for new tag.");
      return;
    }

    setIsAddingNewTag(true);
    const supabase = createClient();

    const { data: newTag, error } = await supabase
      .from('PersonTag')
      .insert({
        name: newTagName,
        relation: newTagRelation,
        profileSharerId
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create new tag');
      setIsAddingNewTag(false);
      return;
    }

    if (newTag) {
      setSelectedTags(prev => [...prev, newTag]);
      setExistingTags(prev => [...prev, newTag]);
      setNewTagName('');
      setNewTagRelation('');
      setIsAddingNewTag(false);
    }
  };

  const handleSave = async () => {
    if (onSave && editingAttachment) {
      const attachmentToSave: Attachment = {
        ...editingAttachment,
        PersonTags: selectedTags, // Use the current selectedTags state
      };
      // <<< NEW LOGGING >>>
      console.log('[AttachmentDialog handleSave] Saving attachment with data:', JSON.stringify(attachmentToSave, null, 2));
      await onSave(attachmentToSave);
      setIsEditing(false);
    }
  };

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setEditingAttachment(null);
    onClose();
  }, [onClose]);

  // Handle navigation
  const handleNavigation = async (direction: 'next' | 'previous') => {
    if (direction === 'next' && onNext) {
      onNext();
    } else if (direction === 'previous' && onPrevious) {
      onPrevious();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete && attachment) {
      onDelete(attachment.id);
      onClose();
    }
    setShowDeleteConfirm(false);
  };

  if (!attachment) return null;

  const showLoadingState = isUrlLoading;

  // <<< MOVED LOGGING HERE >>>
  console.log(`[AttachmentDialog RENDER TAGS] Rendering ${selectedTags.length} tags from state:`, JSON.stringify(selectedTags, null, 2));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {
        onClose();
        setIsEditing(false);
        setShowDeleteConfirm(false);
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
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {/* Existing code */}
          </div>

          {/* Main Content */}
          <div className="flex flex-col lg:grid lg:grid-cols-[3fr_1fr] h-full">
            {/* Left Side - Image/PDF */}
            <div className="w-full lg:h-full flex flex-col">
              {/* Content Container */}
              <div className="relative bg-gray-100 w-full h-[75vh] lg:h-[78vh] overflow-hidden">
                {showLoadingState ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <FileWarning className="h-12 w-12 text-red-400 mb-2" />
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ) : editingAttachment && editingAttachment.fileType.startsWith("image/") && currentSignedUrl ? (
                  <div className="w-full h-full relative">
                    <NextImage
                      src={currentSignedUrl}
                      alt={editingAttachment.title || editingAttachment.fileName || "Attachment Image"}
                      fill
                      className={`object-contain transition-opacity duration-300`}
                      sizes="(max-width: 768px) 90vw, 45vw"
                    />
                  </div>
                ) : editingAttachment && editingAttachment.fileType === 'application/pdf' && currentSignedUrl ? (
                  <iframe
                    src={currentSignedUrl}
                    title={editingAttachment.fileName || "PDF Document"}
                    className="w-full h-full border-0"
                  />
                ) : editingAttachment ? (
                  <AttachmentThumbnail
                    attachment={{
                      ...editingAttachment,
                      signedUrl: currentSignedUrl ?? undefined,
                    }}
                    size="lg"
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                     <FileWarning className="h-12 w-12 text-gray-400 mb-2" />
                     <p className="text-sm text-gray-500">No attachment data</p>
                  </div>
                )}
              </div>

              {/* Navigation Buttons - Full Width on Mobile, Bottom Fixed on Desktop */}
              <div className="flex justify-between items-center gap-2 p-4 bg-white border-b lg:border-t lg:border-b-0">
                <div className="flex gap-2">
                  {hasPrevious && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPrevious?.()}
                      disabled={!hasPrevious || showLoadingState}
                      className="rounded-full"
                      tabIndex={isEditing ? -1 : 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                  )}
                  {hasNext && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNext?.()}
                      disabled={!hasNext || showLoadingState}
                      className="rounded-full"
                      tabIndex={isEditing ? -1 : 0}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {onDownload && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const filePath = attachment.fileUrl.includes('attachments/') 
                            ? attachment.fileUrl.split('attachments/')[1]
                            : attachment.fileUrl;
                          
                          const { data, error } = await supabase.storage
                            .from('attachments')
                            .download(filePath);

                          if (error) throw error;

                          if (data) {
                            const url = URL.createObjectURL(data);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = attachment.fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }
                        } catch (error) {
                          console.error('Error downloading file:', error);
                          toast.error('Failed to download file');
                        }
                      }}
                      className="rounded-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteClick}
                      className="rounded-full text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Metadata */}
            <div className="w-full lg:h-[calc(100vh-8rem)] lg:border-l flex flex-col">
              {/* Metadata Header */}
              <div className="flex items-center justify-between p-4 border-b lg:sticky lg:top-0 lg:z-10">
                <h3 className="font-medium">Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isEditing) {
                      handleSave();
                    } else {
                      // console.log('[AttachmentDialog] Edit button clicked'); // REMOVE
                      setIsEditing(true);
                    }
                  }}
                  disabled={showLoadingState || !onSave} // Disable if onSave is not provided
                  className="rounded-full"
                >
                  {showLoadingState ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                      Loading...
                    </>
                  ) : isEditing ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>

              {/* Scrollable Metadata Content */}
              <div className="p-4 space-y-6 lg:overflow-y-auto lg:flex-1">
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="attachment-description">Description</Label>
                  <Textarea
                    id="attachment-description"
                    value={editingAttachment?.description || ''}
                    onChange={(e) => setEditingAttachment(prev => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        description: e.target.value
                      };
                    })}
                    disabled={!isEditing}
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
                      value={editingAttachment?.dateCaptured instanceof Date
                               ? editingAttachment.dateCaptured.toISOString().split('T')[0]
                               : ''}
                      onChange={(e) => setEditingAttachment(prev => {
                        if (!prev) return prev;
                        const dateValue = e.target.value;
                        return {
                          ...prev,
                          dateCaptured: dateValue ? new Date(`${dateValue}T00:00:00Z`) : null
                        };
                      })}
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
                      value={editingAttachment?.yearCaptured?.toString() || ''}
                      onChange={(e) => setEditingAttachment(prev => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          yearCaptured: e.target.value ? parseInt(e.target.value) : null
                        };
                      })}
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
                          if (tag) {
                            if (!selectedTags.some(t => t.id === tag.id)) {
                              setSelectedTags(prev => [...prev, tag]);
                            }
                          }
                        }}
                        aria-labelledby="people-label"
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Add people..." />
                        </SelectTrigger>
                        <SelectContent>
                          {existingTags.map((tag) => (
                            <SelectItem
                              key={tag.id}
                              value={tag.id}
                            >
                              <div className="flex items-center">
                                <Tag className="mr-2 h-4 w-4" />
                                {tag.name} ({tag.relation})
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value="add-new">
                            <div className="flex items-center text-[#1B4332]">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Add new person
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* New Tag Dialog */}
                  {isAddingNewTag && (
                    <Dialog open={isAddingNewTag} onOpenChange={(open) => !open && setIsAddingNewTag(false)}>
                      <DialogContent 
                        className="max-w-md" 
                        aria-describedby="new-tag-dialog-description"
                      >
                        <DialogHeader>
                          <DialogTitle>Add New Person</DialogTitle>
                          <DialogDescription id="new-tag-dialog-description">
                            Add a new person to tag in your attachments.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="new-tag-name">Name</Label>
                            <Input
                              id="new-tag-name"
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label htmlFor="new-tag-relation">Relationship</Label>
                            <Select
                              value={newTagRelation}
                              onValueChange={(value) => setNewTagRelation(value as PersonRelationType)}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(PersonRelation).map((relation) => (
                                  <SelectItem key={relation} value={relation}>
                                    {relation}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsAddingNewTag(false)}
                              className="rounded-full"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleAddNewTag}
                              disabled={!newTagName || !newTagRelation}
                              className="rounded-full"
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* <<< REMOVE LOGGING HERE >>> */}
                    {/* {console.log('[AttachmentDialog RENDER] selectedTags:', selectedTags)} */}
                    {/* <<< NEW LOGGING >>> */}
                    {selectedTags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant="default"
                        className={isEditing ? "cursor-pointer" : undefined}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.name} ({tag.relation})
                        {isEditing && (
                          <X
                            className="h-3 w-3 ml-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTag(tag.id);
                            }}
                          />
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
                    <p>File name: {attachment.fileName}</p>
                    <p>File type: {attachment.fileType}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent 
            className="sm:max-w-[400px]"
            aria-describedby="delete-dialog-description"
          >
            <DialogHeader>
              <DialogTitle>Delete Attachment</DialogTitle>
              <DialogDescription id="delete-dialog-description">
                Are you sure you want to delete this attachment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-full border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] transition-colors duration-200"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                className="rounded-full bg-red-600 hover:bg-red-700 transition-colors duration-200"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Dialog>
    </>
  );
} 