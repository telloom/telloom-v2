/**
 * File: components/AttachmentUpload.tsx
 * Description:
 *  - We retrieve the real lastName/firstName from `Profile`.
 *  - We retrieve the category name from `PromptCategory`.
 *  - We generate a 4-character alphanumeric suffix (like "a0f1").
 *  - Then we create a final filename: "lastname-firstname_category_a0f1.jpg"
 *  - We upload directly to that name and insert the DB row with `fileUrl` = final name.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from '@/utils/supabase/client';
import { Upload, X, Plus, Tag } from 'lucide-react';
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
import { cn } from "@/lib/utils";
import { PersonRelation, PersonTag } from "@/types/models";
import AttachmentThumbnail from '@/components/AttachmentThumbnail';

interface AttachmentUploadProps {
  promptResponseId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

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

  // Because we need to fetch more info (profile names, category, etc.),
  // store them here once loaded
  const [firstName, setFirstName] = useState('Unknown');
  const [lastName, setLastName] = useState('User');
  const [categoryName, setCategoryName] = useState('untitled');

  // --------------------------------------------------------------------------
  // On mount (whenever dialog opens), fetch the data:
  // 1) profileSharerId
  // 2) profile => firstName, lastName
  // 3) promptResponse => prompt => promptCategory => category
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const supabase = createClient();

        // Check the current user
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
          console.error('Authentication error:', authErr);
          return;
        }

        // Find the ProfileSharer row for that user
        const { data: sharer, error: sharerErr } = await supabase
          .from('ProfileSharer')
          .select('id, profileId')
          .eq('profileId', user.id)
          .single();

        if (sharerErr || !sharer) {
          console.error('No ProfileSharer found for user:', sharerErr);
          return;
        }
        setProfileSharerId(sharer.id);

        // From that profileId, get firstName + lastName from "Profile"
        const { data: profile } = await supabase
          .from('Profile')
          .select('firstName, lastName')
          .eq('id', sharer.profileId)
          .single();

        if (profile) {
          setFirstName(profile.firstName || 'Unknown');
          setLastName(profile.lastName || 'User');
        }

        // Now fetch the PromptResponse -> Prompt -> PromptCategory
        const { data: responseData, error: respErr } = await supabase
          .from('PromptResponse')
          .select(`
            id,
            promptId,
            Prompt(
              promptCategoryId,
              PromptCategory(
                category
              )
            )
          `)
          .eq('id', promptResponseId)
          .single();

        if (respErr || !responseData) {
          console.error('No PromptResponse found for that ID:', respErr);
          return;
        }

        // retrieve category from nested data
        const cat = responseData.Prompt?.PromptCategory?.category || 'untitled';
        setCategoryName(cat);
      } catch (e) {
        console.error('Error fetching initial data:', e);
      }
    }

    if (isOpen) {
      fetchInitialData();
    }
  }, [promptResponseId, isOpen]);

  // --------------------------------------------------------------------------
  // Basic slugify for lastName, firstName, category
  // --------------------------------------------------------------------------
  function basicSlugify(input: string) {
    return input
      .toLowerCase()
      .replace(/[^\w\s-]+/g, '') // remove non-alphanumeric
      .replace(/\s+/g, '-')     // spaces -> dashes
      .replace(/-+/g, '-');     // collapse repeated dashes
  }

  // --------------------------------------------------------------------------
  // 4-Char Alphanumeric Suffix
  //  e.g. "f4a7"
  // --------------------------------------------------------------------------
  function random4Alphanumeric(): string {
    return Math.random().toString(36).substring(2, 6);
  }

  // --------------------------------------------------------------------------
  // Generate final name = "lastname-firstname_category_XXXX.ext"
  // where XXXX is 4 alphanumeric chars
  // --------------------------------------------------------------------------
  function generateFinalFilename(
    last: string,
    first: string,
    cat: string,
    extension: string
  ) {
    const safeLast = basicSlugify(last);
    const safeFirst = basicSlugify(first);
    const safeCat = basicSlugify(cat);
    const suffix = random4Alphanumeric(); // "a0f3"
    return `${safeLast}-${safeFirst}_${safeCat}_${suffix}.${extension}`;
  }

  // --------------------------------------------------------------------------
  // On user picking a file
  // --------------------------------------------------------------------------
  const handleFileSelect = useCallback(async (evt: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let selectedFiles: File[] = [];
    
    if ('dataTransfer' in evt) {
      // Drag & Drop
      evt.preventDefault();
      if (evt.dataTransfer.files?.length) {
        selectedFiles = [evt.dataTransfer.files[0]];
      }
    } else if ('target' in evt && evt.target.files?.length) {
      // <input type="file">
      selectedFiles = [evt.target.files[0]];
    }

    if (!selectedFiles.length) return;

    // Clear older previews
    previews.forEach((p) => {
      if (p !== 'pdf') URL.revokeObjectURL(p);
    });
    setFiles([]);
    setPreviews([]);

    const file = selectedFiles[0];
    const processed: File[] = [];
    const newPreviews: string[] = [];

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
        processed.push(convertedFile);
        newPreviews.push(URL.createObjectURL(convertedFile));
        toast.success(`Converted ${file.name} to JPEG`);
      } catch (error) {
        toast.error(`Failed to convert ${file.name}`);
      }
    } else if (
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type === 'image/webp' ||
      file.type === 'application/pdf'
    ) {
      processed.push(file);
      newPreviews.push(URL.createObjectURL(file));
    } else {
      toast.error(`Unsupported file type: ${file.name}`);
    }

    setFiles(processed);
    setPreviews(newPreviews);
  }, [previews]);

  // --------------------------------------------------------------------------
  // Insert new PersonTag record
  // --------------------------------------------------------------------------
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
      setSelectedTags((prev) => [...prev, newTag]);
      setExistingTags((prev) => [...prev, newTag]);
      setNewTagName('');
      setNewTagRelation('');
      setIsAddingTag(false);
    }
  };

  // --------------------------------------------------------------------------
  // Actually do the upload: final name, then insert
  // --------------------------------------------------------------------------
  const handleUpload = async (shouldClose: boolean = true) => {
    if (!files.length) return;

    setIsUploading(true);
    const supabase = createClient();

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        toast.error('Not authenticated');
        return;
      }

      // Make sure we have a valid profileSharerId
      if (!profileSharerId) {
        throw new Error('profileSharerId not found yet.');
      }

      // We'll create a new attachment record
      const attachmentId = crypto.randomUUID();

      // e.g. from "myphoto.JPG" => "jpg"
      const file = files[0];
      const fileExt = file.name.split('.').pop() || 'dat';

      // Build final name from real data
      const finalName = generateFinalFilename(
        lastName,
        firstName,
        categoryName,
        fileExt
      );

      console.log('Uploading to path:', finalName);
      const { error: uploadError } = await supabase
        .storage
        .from('attachments')
        .upload(finalName, file);

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      // Insert DB row with the same final name
      const attachmentRecord = {
        id: attachmentId,
        promptResponseId,
        profileSharerId,
        fileUrl: finalName,
        fileType: file.type,
        fileName: finalName,
        fileSize: file.size,
        description: description || null,
        dateCaptured: dateCaptured || null,
        yearCaptured: yearCaptured ? parseInt(yearCaptured) : null,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('PromptResponseAttachment')
        .insert(attachmentRecord)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create attachment record: ${insertError.message}`);
      }

      // Link PersonTags if any
      if (selectedTags.length > 0) {
        const { error: tagError } = await supabase
          .from('PromptResponseAttachmentPersonTag')
          .insert(
            selectedTags.map(tag => ({
              promptResponseAttachmentId: inserted.id,
              personTagId: tag.id
            }))
          );

        if (tagError) {
          throw new Error(`Failed to link tags: ${tagError.message}`);
        }
      }

      toast.success('File uploaded successfully');
      onUploadSuccess();
      
      if (shouldClose) {
        onClose();
      } else {
        // Reset form
        setFiles([]);
        setPreviews([]);
        setDescription('');
        setDateCaptured('');
        setYearCaptured('');
        setSelectedTags([]);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
    setPreviews((prev) => {
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

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
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
                className="
                  mt-2 p-8 border-2 border-dashed rounded-lg
                  border-gray-300 hover:border-gray-400
                  transition-colors duration-200
                  flex flex-col items-center justify-center gap-4
                  relative
                  cursor-pointer
                "
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

          {/* If user already selected a file */}
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
                        fileUrl: previews[0],
                        fileType: files[0].type,
                        fileName: files[0].name,
                        description: null,
                        dateCaptured: null,
                        yearCaptured: null
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

        {/* Upload Buttons */}
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
                {isUploading ? 'Uploading...' : 'Save & Add'}
              </Button>
              <Button
                onClick={() => handleUpload(true)}
                disabled={isUploading}
                className="rounded-full"
              >
                {isUploading ? 'Uploading...' : 'Save & Close'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}