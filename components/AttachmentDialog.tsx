/**
 * File: components/AttachmentDialog.tsx
 * Description: A dialog component for viewing and editing attachment metadata including title, description,
 * date captured, year, and person tags. Supports image preview and navigation between multiple attachments.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from '@/utils/supabase/client';
import { FileText, Tag, X, Edit, Check, ChevronLeft, ChevronRight, PlusCircle, Loader2, ImageOff, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { person_relation } from '@prisma/client';
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

// Define the enum values since they might not be available at runtime
const PersonRelation = {
  Mother: 'Mother',
  Father: 'Father',
  Sister: 'Sister',
  Brother: 'Brother',
  Daughter: 'Daughter',
  Son: 'Son',
  Grandmother: 'Grandmother',
  Grandfather: 'Grandfather',
  Spouse: 'Spouse',
  Partner: 'Partner',
  Friend: 'Friend',
  Other: 'Other'
} as const;

type PersonRelationType = typeof PersonRelation[keyof typeof PersonRelation];

interface PersonTag {
  id: string;
  name: string;
  relation: PersonRelationType;
}

interface Attachment {
  id: string;
  fileUrl: string;
  displayUrl?: string;
  fileType: string;
  fileName: string;
  description?: string;
  dateCaptured?: string;
  yearCaptured?: number;
  PersonTags?: PersonTag[];
}

interface PromptResponseAttachmentPersonTag {
  personTag: PersonTag;
}

interface AttachmentWithNestedTags extends Omit<Attachment, 'PersonTags'> {
  PersonTags: PromptResponseAttachmentPersonTag[];
}

interface AttachmentWithTags {
  id: string;
  description: string | null;
  dateCaptured: string | null;
  yearCaptured: number | null;
  PromptResponseAttachmentPersonTag: Array<{
    PersonTag: {
      id: string;
      name: string;
      relation: PersonRelationType;
    };
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
  onSave?: () => Promise<void>;
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
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(attachment?.description || '');
  const [dateCaptured, setDateCaptured] = useState(attachment?.dateCaptured || '');
  const [yearCaptured, setYearCaptured] = useState(attachment?.yearCaptured?.toString() || '');
  const [selectedTags, setSelectedTags] = useState<PersonTag[]>(attachment?.PersonTags || []);
  const [existingTags, setExistingTags] = useState<PersonTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingNewTag, setIsAddingNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagRelation, setNewTagRelation] = useState<PersonRelationType>(PersonRelation.Other);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [currentSignedUrl, setCurrentSignedUrl] = useState<string | undefined>(initialSignedUrl);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Function to get signed URL
  const getSignedUrl = async (fileUrl: string) => {
    const supabase = createClient();
    const filePath = fileUrl.includes('attachments/') 
      ? fileUrl.split('attachments/')[1]
      : fileUrl;
    
    const { data, error } = await supabase
      .storage
      .from('attachments')
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data?.signedUrl;
  };

  // Handle attachment change
  useEffect(() => {
    const updateAttachment = async () => {
      if (!attachment) return;

      setImageLoading(true);
      setImageError(false);

      // If we have an initial signed URL, use it
      if (initialSignedUrl) {
        setCurrentSignedUrl(initialSignedUrl);
        setImageLoading(false);
        return;
      }

      // Otherwise get a new signed URL
      const newSignedUrl = await getSignedUrl(attachment.fileUrl);
      if (newSignedUrl) {
        setCurrentSignedUrl(newSignedUrl);
        setImageError(false);
      } else {
        setImageError(true);
      }
      setImageLoading(false);
    };

    updateAttachment();
  }, [attachment?.id, initialSignedUrl]);

  // Pre-fetch next and previous signed URLs
  useEffect(() => {
    if (!hasNext && !hasPrevious) return;

    const prefetchUrls = async () => {
      if (attachment && !initialSignedUrl && !currentSignedUrl) {
        const newSignedUrl = await getSignedUrl(attachment.fileUrl);
        if (newSignedUrl) {
          setCurrentSignedUrl(newSignedUrl);
        }
      }
    };

    prefetchUrls();
  }, [hasNext, hasPrevious, attachment?.fileUrl, initialSignedUrl, currentSignedUrl]);

  // Handle navigation
  const handleNavigation = async (direction: 'next' | 'previous') => {
    setImageLoading(true);
    if (direction === 'next' && onNext) {
      onNext();
    } else if (direction === 'previous' && onPrevious) {
      onPrevious();
    }
  };

  useEffect(() => {
    const fetchAttachmentData = async () => {
      if (!attachment?.id || !isOpen) return;

      const supabase = createClient();
      
      // Fetch the attachment with its tags
      const { data: attachmentData, error } = await supabase
        .from('PromptResponseAttachment')
        .select(`
          *,
          PromptResponseAttachmentPersonTag (
            PersonTag (
              id,
              name,
              relation
            )
          )
        `)
        .eq('id', attachment.id)
        .single();

      if (error) {
        console.error('Error fetching attachment data:', error);
        return;
      }

      if (attachmentData) {
        // Transform the nested tags data
        const personTags = (attachmentData as AttachmentWithTags).PromptResponseAttachmentPersonTag
          ?.map((pt: { PersonTag: PersonTag }) => pt.PersonTag)
          .filter(Boolean) || [];

        setDescription(attachmentData.description || '');
        setDateCaptured(attachmentData.dateCaptured || '');
        setYearCaptured(attachmentData.yearCaptured?.toString() || '');
        setSelectedTags(personTags);
      }
    };

    fetchAttachmentData();
  }, [attachment?.id, isOpen]);

  useEffect(() => {
    const fetchTags = async () => {
      if (!isOpen) return;

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profileSharer } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', session.user.id)
        .single();

      if (!profileSharer) return;

      const { data: tags } = await supabase
        .from('PersonTag')
        .select('*')
        .eq('profileSharerId', profileSharer.id);

      if (tags) {
        setExistingTags(tags);
      }
    };

    fetchTags();
  }, [isOpen]);

  const handleSave = async () => {
    if (!attachment) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      // Update attachment metadata
      const { error: updateError } = await supabase
        .from('PromptResponseAttachment')
        .update({
          description,
          dateCaptured: dateCaptured || null,
          yearCaptured: yearCaptured ? parseInt(yearCaptured) : null
        })
        .eq('id', attachment.id);

      if (updateError) {
        console.error('Error updating attachment metadata:', updateError.message, updateError.details);
        throw new Error(`Failed to update attachment: ${updateError.message}`);
      }

      // Delete existing tags
      const { error: deleteError } = await supabase
        .from('PromptResponseAttachmentPersonTag')
        .delete()
        .eq('promptResponseAttachmentId', attachment.id);

      if (deleteError) {
        console.error('Error deleting existing tags:', deleteError.message, deleteError.details);
        throw new Error(`Failed to delete existing tags: ${deleteError.message}`);
      }

      // Add new tags
      if (selectedTags.length > 0) {
        const { error: tagError } = await supabase
          .from('PromptResponseAttachmentPersonTag')
          .insert(
            selectedTags.map(tag => ({
              promptResponseAttachmentId: attachment.id,
              personTagId: tag.id
            }))
          );

        if (tagError) {
          console.error('Error adding new tags:', tagError.message, tagError.details);
          throw new Error(`Failed to add new tags: ${tagError.message}`);
        }
      }

      // Call onSave to refresh parent data
      if (onSave) {
        await onSave();
      }

      toast.success('Attachment updated successfully');
      setIsEditing(false);

    } catch (error) {
      console.error('Error updating attachment:', error instanceof Error ? error.message : 'Unknown error');
      toast.error(error instanceof Error ? error.message : 'Failed to update attachment');
    } finally {
      setIsLoading(false);
    }
  };

  const removeTag = (tagId: string) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagId));
  };

  const handleAddNewTag = async () => {
    if (!newTagName.trim()) return;

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profileSharer } = await supabase
      .from('ProfileSharer')
      .select('id')
      .eq('profileId', session.user.id)
      .single();

    if (!profileSharer) return;

    try {
      const { data: newTag, error } = await supabase
        .from('PersonTag')
        .insert({
          name: newTagName.trim(),
          relation: newTagRelation,
          profileSharerId: profileSharer.id
        })
        .select()
        .single();

      if (error) throw error;

      setExistingTags(prev => [...prev, newTag]);
      setSelectedTags(prev => [...prev, newTag]);
      setNewTagName('');
      setNewTagRelation(PersonRelation.Other);
      setIsAddingNewTag(false);
      toast.success('Person added successfully');
    } catch (error) {
      console.error('Error adding new person:', error);
      toast.error('Failed to add person');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && attachment) {
      onDelete(attachment.id);
      onClose();
    }
  };

  if (!attachment) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-5xl h-[90vh] flex flex-col p-0 lg:p-6 m-0 lg:m-4 overflow-y-auto lg:overflow-hidden" 
        >
          <div className="sr-only">
            <DialogHeader>
              <DialogTitle>View Attachment</DialogTitle>
              <DialogDescription>
                View and edit attachment details including description, date, and tags.
              </DialogDescription>
            </DialogHeader>
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
                  <iframe
                    src={currentSignedUrl + '#toolbar=0'}
                    className="w-full h-full"
                    title="PDF viewer"
                    style={{ backgroundColor: 'white' }}
                  />
                ) : (
                  <AttachmentThumbnail 
                    attachment={{
                      ...attachment,
                      fileUrl: attachment.displayUrl || attachment.fileUrl,
                      signedUrl: currentSignedUrl
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
                  {onDownload && attachment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownload(attachment)}
                      className="rounded-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                  {onDelete && attachment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteClick}
                      className="rounded-full text-red-600 hover:bg-red-50"
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
                  {isEditing ? (
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
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                      value={dateCaptured}
                      onChange={(e) => setDateCaptured(e.target.value)}
                      disabled={!isEditing}
                      style={{ colorScheme: 'light' }}
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
                      value={yearCaptured}
                      onChange={(e) => setYearCaptured(e.target.value)}
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
                      <DialogContent className="max-w-md" aria-describedby="new-tag-dialog-description">
                        <DialogHeader>
                          <DialogTitle>Add New Person</DialogTitle>
                          <DialogDescription id="new-tag-dialog-description">Add a new person to tag in your attachments.</DialogDescription>
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
      </Dialog>
    </>
  );
} 