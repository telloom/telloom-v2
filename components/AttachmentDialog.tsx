/**
 * File: components/AttachmentDialog.tsx
 * Description: A dialog component for viewing and editing attachment metadata including title, description,
 * date captured, year, and person tags. Supports image preview and navigation between multiple attachments.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from '@/utils/supabase/client';
import { FileText, Tag, X, Edit, Check, ChevronLeft, ChevronRight, PlusCircle, Loader2, ImageOff, Download, Trash2 } from 'lucide-react';
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
  description: string | null;
  dateCaptured: string | null;
  yearCaptured: number | null;
  PersonTags: PersonTag[];
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
  signedUrl?: string;
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
  signedUrl: initialSignedUrl,
  onSave,
  onDelete,
  onDownload
}: AttachmentDialogProps) {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<Attachment | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | undefined>(initialSignedUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNewTag, setIsAddingNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagRelation, setNewTagRelation] = useState<PersonRelation | ''>('');
  const [existingTags, setExistingTags] = useState<PersonTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<PersonTag[]>([]);
  const [profileSharerId, setProfileSharerId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when attachment changes
  useEffect(() => {
    if (attachment) {
      const personTags = attachment.PersonTags || [];
      const safeAttachment: Attachment = {
        ...attachment,
        description: attachment.description || null,
        dateCaptured: attachment.dateCaptured || null,
        yearCaptured: attachment.yearCaptured || null,
        PersonTags: personTags
      };
      setEditingAttachment(safeAttachment);
      setSignedUrl(initialSignedUrl);
      setImageLoading(!initialSignedUrl);
      setSelectedTags(personTags);
      setIsEditing(false); // Reset editing state
      setIsLoading(true); // Set loading to true when a new attachment is loaded
    }
  }, [attachment, initialSignedUrl]);

  // Debug log for isLoading state changes
  useEffect(() => {
    console.log('[AttachmentDialog] isLoading state changed:', isLoading);
  }, [isLoading]);

  // Combine user and profile data fetching into a single effect
  useEffect(() => {
    let mounted = true;
    
    async function fetchData() {
      if (!isOpen || !attachment?.id) return;

      try {
        const supabase = createClient();
        
        // Get user and profile data first
        if (authLoading) return;
        if (!user || !mounted) return;

        // Get profile data
        const { data: profileSharer, error: profileError } = await supabase
          .from('ProfileSharer')
          .select('id')
          .eq('profileId', user.id)
          .single();

        if (profileError) throw profileError;
        if (profileSharer && mounted) {
          setProfileSharerId(profileSharer.id);
        }

        // Fetch attachment data with all related information
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('PromptResponseAttachment')
          .select(`
            *,
            PromptResponseAttachmentPersonTag (
              PersonTag (
                id,
                name,
                relation,
                profileSharerId
              )
            )
          `)
          .eq('id', attachment.id)
          .single();

        if (attachmentError) throw attachmentError;
        if (!mounted) return;

        // Fetch all available tags for this profile
        const { data: tags, error: tagsError } = await supabase
          .from('PersonTag')
          .select('*')
          .eq('profileSharerId', profileSharer.id);

        if (tagsError) throw tagsError;
        if (!mounted) return;

        if (tags) {
          setExistingTags(tags);
        }

        // Process attachment data
        if (attachmentData) {
          const personTags = attachmentData.PromptResponseAttachmentPersonTag
            ?.map((pt: { PersonTag: PersonTag }) => pt.PersonTag)
            .filter(Boolean) || [];

          const processedAttachment: Attachment = {
            ...attachmentData,
            PersonTags: personTags,
            description: attachmentData.description || null,
            dateCaptured: attachmentData.dateCaptured || null,
            yearCaptured: attachmentData.yearCaptured || null
          };

          setEditingAttachment(processedAttachment);
          setSelectedTags(personTags);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();
    return () => { mounted = false; };
  }, [isOpen, attachment?.id, user, authLoading]);

  // Optimize URL handling
  useEffect(() => {
    let mounted = true;

    async function getSignedUrl() {
      if (!attachment?.fileUrl || signedUrl) return;

      try {
        const cachedUrl = urlCache.get(attachment.id);
        if (cachedUrl) {
          setSignedUrl(cachedUrl);
          setImageLoading(false);
          return;
        }

        const filePath = attachment.fileUrl.includes('attachments/') 
          ? attachment.fileUrl.split('attachments/')[1]
          : attachment.fileUrl;
        
        const { data, error } = await supabase
          .storage
          .from('attachments')
          .createSignedUrl(filePath, 3600);

        if (!mounted) return;

        if (error) {
          console.error('Error getting signed URL:', error);
          setError(true);
          setImageLoading(false);
          return;
        }

        if (data?.signedUrl) {
          urlCache.set(attachment.id, data.signedUrl, 3500);
          setSignedUrl(data.signedUrl);
          setError(false);
        }
      } catch (error) {
        console.error('Error getting signed URL:', error);
        setError(true);
      } finally {
        if (mounted) {
          setImageLoading(false);
        }
      }
    }

    // Only fetch if we don't have a signed URL and there's a fileUrl
    if (!signedUrl && attachment?.fileUrl) {
      getSignedUrl();
    }
    return () => { mounted = false; };
  }, [attachment?.id, attachment?.fileUrl, signedUrl, supabase]);

  const removeTag = useCallback((tagId: string) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagId));
  }, []);

  useEffect(() => {
    const fetchProfileSharerId = async () => {
      const supabase = createClient();
      if (user) {
        const { data: profile } = await supabase
          .from('ProfileSharer')
          .select('id')
          .eq('profileId', user.id)
          .single();
        if (profile) {
          setProfileSharerId(profile.id);
        }
      }
    };
    fetchProfileSharerId();
  }, [user]);

  const handleAddNewTag = async () => {
    if (!newTagName || !newTagRelation || !profileSharerId) return;

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

  const handleSave = useCallback(async () => {
    if (!editingAttachment || !onSave) return;

    try {
      setIsLoading(true);
      const supabase = createClient();

      // Update attachment metadata
      const { error: updateError } = await supabase
        .from('PromptResponseAttachment')
        .update({
          description: editingAttachment.description,
          dateCaptured: editingAttachment.dateCaptured,
          yearCaptured: editingAttachment.yearCaptured
        })
        .eq('id', editingAttachment.id);

      if (updateError) throw updateError;

      // Remove existing tags
      const { error: deleteError } = await supabase
        .from('PromptResponseAttachmentPersonTag')
        .delete()
        .eq('promptResponseAttachmentId', editingAttachment.id);

      if (deleteError) throw deleteError;

      // Add new tags
      if (selectedTags.length > 0) {
        const { error: tagError } = await supabase
          .from('PromptResponseAttachmentPersonTag')
          .insert(
            selectedTags.map(tag => ({
              promptResponseAttachmentId: editingAttachment.id,
              personTagId: tag.id
            }))
          );

        if (tagError) throw tagError;
      }

      const updatedAttachment: Attachment = {
        ...editingAttachment,
        PersonTags: selectedTags
      };

      // Call onSave without awaiting to prevent dialog close
      onSave(updatedAttachment);
      
      // Refetch the data to ensure we have the latest state
      const { data: refreshedData, error: refreshError } = await supabase
        .from('PromptResponseAttachment')
        .select(`
          *,
          PromptResponseAttachmentPersonTag (
            PersonTag (
              id,
              name,
              relation,
              profileSharerId
            )
          )
        `)
        .eq('id', editingAttachment.id)
        .single();

      if (!refreshError && refreshedData) {
        const personTags = refreshedData.PromptResponseAttachmentPersonTag
          ?.map((pt: { PersonTag: PersonTag }) => pt.PersonTag)
          .filter(Boolean) || [];

        const processedAttachment: Attachment = {
          ...refreshedData,
          PersonTags: personTags,
          description: refreshedData.description || null,
          dateCaptured: refreshedData.dateCaptured || null,
          yearCaptured: refreshedData.yearCaptured || null
        };

        setEditingAttachment(processedAttachment);
        setSelectedTags(personTags);
      }

      setIsEditing(false);
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Error saving attachment:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  }, [editingAttachment, onSave, selectedTags]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setIsEditing(false);
      setEditingAttachment(null);
      onClose();
    }
  }, [onClose, isLoading]);

  // Handle navigation
  const handleNavigation = async (direction: 'next' | 'previous') => {
    setImageLoading(true);
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {
        onClose();
        setIsEditing(false);
        setShowDeleteConfirm(false);
      }}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl h-[90vh] flex flex-col p-4 md:p-6 mx-auto overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>View Attachment</DialogTitle>
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
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                )}
                {attachment.fileType === 'application/pdf' ? (
                  <div className="w-full h-full bg-white">
                    {signedUrl && (
                      <iframe
                        src={signedUrl + '#toolbar=0'}
                        className="w-full h-full"
                        title="PDF viewer"
                      />
                    )}
                  </div>
                ) : (
                  <AttachmentThumbnail 
                    attachment={{
                      ...attachment,
                      fileUrl: attachment.displayUrl || attachment.fileUrl,
                      signedUrl: signedUrl || attachment.signedUrl,
                      dateCaptured: attachment.dateCaptured ? 
                        (typeof attachment.dateCaptured === 'string' ? 
                          attachment.dateCaptured : 
                          new Date(attachment.dateCaptured).toISOString().split('T')[0]) 
                        : null
                    }}
                    size="lg"
                    className="w-full h-full object-contain"
                  />
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
                      disabled={!hasPrevious || imageLoading}
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
                      disabled={!hasNext || imageLoading}
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
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  disabled={isLoading}
                  className="rounded-full"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#1B4332] mr-2"></div>
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
                      value={editingAttachment?.dateCaptured ? 
                        (typeof editingAttachment.dateCaptured === 'string' ? 
                          editingAttachment.dateCaptured : 
                          new Date(editingAttachment.dateCaptured).toISOString().split('T')[0]) 
                        : ''}
                      onChange={(e) => setEditingAttachment(prev => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          dateCaptured: e.target.value
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