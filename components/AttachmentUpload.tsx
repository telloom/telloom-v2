/**
 * File: components/AttachmentUpload.tsx
 * Description: A comprehensive attachment upload component that handles image and PDF file uploads,
 * including HEIC/HEIF conversion, file previews, metadata management (dates, descriptions), and person tagging.
 * Supports drag-and-drop, integrates with Supabase storage, and provides real-time upload status feedback.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from '@/utils/supabase/client';
import { Upload, X, Image as ImageIcon, FileText, Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';
import heic2any from 'heic2any';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { PersonRelation, PersonTag } from "@/types/models";
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
import AttachmentThumbnail from '@/components/AttachmentThumbnail';

interface AttachmentUploadProps {
  promptResponseId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

// Export as default for dynamic import
export default function AttachmentUpload({
  promptResponseId,
  isOpen,
  onClose,
  onUploadSuccess
}: AttachmentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [dateCaptured, setDateCaptured] = useState('');
  const [yearCaptured, setYearCaptured] = useState('');
  const [selectedTags, setSelectedTags] = useState<PersonTag[]>([]);
  const [existingTags, setExistingTags] = useState<PersonTag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagRelation, setNewTagRelation] = useState<PersonRelation | ''>('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [profileSharerId, setProfileSharerId] = useState<string>('');

  useEffect(() => {
    const fetchProfileSharerId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
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
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let selectedFiles: File[] = [];
    
    if ('dataTransfer' in event) {
      // Handle drag and drop
      event.preventDefault();
      if (event.dataTransfer.files?.length) {
        selectedFiles = [event.dataTransfer.files[0]]; // Only take the first file
      }
    } else if ('target' in event && event.target.files?.length) {
      // Handle file input
      selectedFiles = [event.target.files[0]]; // Only take the first file
    }

    if (!selectedFiles.length) return;

    // Clear existing files and previews
    previews.forEach(preview => {
      if (preview !== 'pdf') {
        URL.revokeObjectURL(preview);
      }
    });
    setFiles([]);
    setPreviews([]);

    const processedFiles: File[] = [];
    const newPreviews: string[] = [];

    const file = selectedFiles[0];
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      try {
        const blob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });

        const convertedFile = new File(
          [blob as Blob],
          file.name.replace(/\.(heic|heif)$/i, '.jpg'),
          { type: 'image/jpeg' }
        );
        processedFiles.push(convertedFile);
        
        // Create preview for converted image
        const previewUrl = URL.createObjectURL(convertedFile);
        newPreviews.push(previewUrl);
        
        toast.success(`Converted ${file.name} to JPEG`);
      } catch (error) {
        console.error('Error converting HEIC file:', error);
        toast.error(`Failed to convert ${file.name}`);
      }
    } else if (
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type === 'image/webp' ||
      file.type === 'application/pdf'
    ) {
      processedFiles.push(file);
      
      // Create preview for image files
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);
      } else {
        // Push placeholder for PDFs
        newPreviews.push('pdf');
      }
    } else {
      toast.error(`Unsupported file type: ${file.name}`);
    }

    setFiles(processedFiles);
    setPreviews(newPreviews);
  }, [previews]);

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
      setIsAddingTag(false);
    }
  };

  const handleUpload = async (shouldClose: boolean = true) => {
    if (!files.length) return;

    setIsUploading(true);
    const supabase = createClient();

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Authentication error:', authError);
        toast.error('Not authenticated');
        return;
      }

      // Get ProfileSharer record
      const { data: profileSharer } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', user.id)
        .single();

      if (!profileSharer) throw new Error('Profile sharer not found');

      // Upload the file
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      // Create attachment record
      const { data: attachment, error: dbError } = await supabase
        .from('PromptResponseAttachment')
        .insert({
          promptResponseId,
          profileSharerId: profileSharer.id,
          fileUrl: fileName,
          fileType: file.type,
          fileName,
          fileSize: file.size,
          description: description || null,
          dateCaptured: dateCaptured || null,
          yearCaptured: yearCaptured ? parseInt(yearCaptured) : null,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Failed to create attachment record: ${dbError.message}`);
      }

      // Create person tag links
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
          console.error('Tag linking error:', tagError);
          throw new Error(`Failed to link tags: ${tagError.message}`);
        }
      }

      toast.success('File uploaded successfully');
      onUploadSuccess();
      
      if (shouldClose) {
        onClose();
      } else {
        // Reset form for next upload
        setFiles([]);
        setPreviews([]);
        setDescription('');
        setDateCaptured('');
        setYearCaptured('');
        setSelectedTags([]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
    setPreviews(prev => {
      const newPreviews = [...prev];
      if (newPreviews[index] !== 'pdf') {
        URL.revokeObjectURL(newPreviews[index]);
      }
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const removeTag = (tagId: string) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] flex flex-col" 
        aria-describedby="upload-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription id="upload-dialog-description">
            Add images or PDFs to your response. You can add descriptions and tag people in them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
          {/* File Upload */}
          {files.length === 0 && (
            <div>
              <Label htmlFor="files">Upload File</Label>
              <div
                className={`
                  mt-2 p-8 border-2 border-dashed rounded-lg
                  border-gray-300 hover:border-gray-400
                  transition-colors duration-200
                  flex flex-col items-center justify-center gap-4
                  relative
                  cursor-pointer
                `}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileSelect}
                onClick={() => document.getElementById('files')?.click()}
              >
                <Input
                  id="files"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports JPEG, PNG, WEBP, HEIC, and PDF
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selected File */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Selected File</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFiles([]);
                    previews.forEach(preview => {
                      if (preview !== 'pdf') {
                        URL.revokeObjectURL(preview);
                      }
                    });
                    setPreviews([]);
                  }}
                  className="h-8 text-gray-500 hover:text-gray-700"
                >
                  Remove
                </Button>
              </Label>
              <div className="max-w-md mx-auto">
                <div className="relative group">
                  <div className="rounded-lg overflow-hidden bg-gray-100 border h-[300px] flex items-center justify-center p-4">
                    <AttachmentThumbnail 
                      attachment={{
                        id: 'preview',
                        fileUrl: previews[0] === 'pdf' ? files[0].name : previews[0],
                        fileType: files[0].type,
                        fileName: files[0].name,
                        signedUrl: previews[0] === 'pdf' ? undefined : previews[0]
                      }}
                      size="lg"
                      className="w-full h-full"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    {files[0].name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Person Tags */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>People in Files</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingTag(true)}
                className="h-8 rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </Button>
            </div>

            {/* Tag Selection */}
            {!isAddingTag && (
              <div className="space-y-4">
                <Select
                  value=""
                  onValueChange={(value) => {
                    const tag = existingTags.find(t => t.id === value);
                    if (tag) {
                      if (selectedTags.some(t => t.id === tag.id)) {
                        removeTag(tag.id);
                      } else {
                        setSelectedTags(prev => [...prev, tag]);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select people..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingTags.map((tag) => (
                      <SelectItem
                        key={tag.id}
                        value={tag.id}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center">
                          {selectedTags.some(t => t.id === tag.id) ? (
                            <span className="mr-2">✓</span>
                          ) : (
                            <span className="mr-2 opacity-0">✓</span>
                          )}
                          {tag.name} ({tag.relation})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant="default"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag.id)}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag.name} ({tag.relation})
                      <X className="h-3 w-3 ml-1" onClick={(e) => {
                        e.stopPropagation();
                        removeTag(tag.id);
                      }} />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* New Tag Form */}
            {isAddingTag && (
              <div className="space-y-4 border rounded-lg p-4">
                <div>
                  <Label htmlFor="tagName">Name</Label>
                  <Input
                    id="tagName"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="tagRelation">Relationship</Label>
                  <Select
                    value={newTagRelation}
                    onValueChange={(value) => setNewTagRelation(value as PersonRelation)}
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
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingTag(false)}
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
                    Add Person
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateCaptured">Date (Optional)</Label>
                <Input
                  id="dateCaptured"
                  type="date"
                  value={dateCaptured}
                  onChange={(e) => setDateCaptured(e.target.value)}
                  className="mt-2"
                  style={{ colorScheme: 'light' }}
                />
              </div>

              <div>
                <Label htmlFor="yearCaptured">Year (Optional)</Label>
                <Input
                  id="yearCaptured"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={yearCaptured}
                  onChange={(e) => setYearCaptured(e.target.value)}
                  className="mt-2"
                  placeholder="e.g., 1999"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Upload Buttons - Fixed at bottom */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          {files.length > 0 && (
            <>
              <Button
                onClick={() => handleUpload(false)}
                disabled={isUploading}
                className="rounded-full"
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>Save & Add</>
                )}
              </Button>
              <Button
                onClick={() => handleUpload(true)}
                disabled={isUploading}
                className="rounded-full"
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>Save & Close</>
                )}
              </Button>
            </>
          )}
        </div>

        {/* New Tag Dialog */}
        {isAddingTag && (
          <Dialog open={isAddingTag} onOpenChange={(open) => !open && setIsAddingTag(false)}>
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
              {/* ... rest of the new tag dialog content ... */}
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
} 