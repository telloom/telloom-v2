/**
 * File: components/AttachmentUpload.tsx
 * Description:
 *  - Uploads attachments for a given promptResponseId, associating them with the target Sharer.
 *  - Fetches Sharer details (name) and prompt category for filename generation.
 *  - Fetches and manages PersonTags belonging to the Sharer.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from '@/utils/supabase/client';
import { Upload, X, Plus, Tag, FileText, FileIcon, AlertCircle } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/lib/database.types'; // Import Database type
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AttachmentUploadProps {
  promptResponseId: string;
  targetSharerId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function AttachmentUpload({
  promptResponseId,
  targetSharerId,
  isOpen,
  onClose,
  onUploadSuccess
}: AttachmentUploadProps) {
  console.log('[AttachmentUpload] Component mounted, isOpen:', isOpen, 'promptResponseId:', promptResponseId);
  
  // Add effect to log when dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log('[DEBUG] AttachmentUpload dialog opened with promptResponseId:', promptResponseId);
    }
  }, [isOpen, promptResponseId]);
  
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tags, setTags] = useState<PersonTag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagRelation, setNewTagRelation] = useState<PersonRelation | ''>('');
  const [profileSharerId, setProfileSharerId] = useState<string | null>(null);
  const [sharerFirstName, setSharerFirstName] = useState('');
  const [sharerLastName, setSharerLastName] = useState('');
  const [promptCategory, setPromptCategory] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileDescriptions, setFileDescriptions] = useState<Record<number, string>>({});
  const [fileDates, setFileDates] = useState<Record<number, string>>({});
  const [fileYears, setFileYears] = useState<Record<number, number | null>>({});
  const [isTagsLoading, setIsTagsLoading] = useState(true);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [isTagAddLoading, setIsTagAddLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [dateCaptured, setDateCaptured] = useState('');
  const [yearCaptured, setYearCaptured] = useState('');
  const [selectedTags, setSelectedTags] = useState<PersonTag[]>([]);
  const [existingTags, setExistingTags] = useState<PersonTag[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // On mount (whenever dialog opens), fetch the data:
  // 1) Set profileSharerId from prop
  // 2) Fetch Sharer's profile => firstName, lastName using targetSharerId
  // 3) Fetch promptResponse => prompt => promptCategory => category using promptResponseId
  // 4) Fetch existing PersonTags for the targetSharerId
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function fetchInitialData() {
      if (!isOpen || !targetSharerId || !user || authLoading) {
        console.log('[AttachmentUpload] Initial data fetch skipped (dialog closed, targetSharerId missing, or auth not ready).');
        return;
      }

      setIsMetadataLoading(true);
      setIsTagsLoading(true);
      setProfileSharerId(targetSharerId);
      console.log(`[AttachmentUpload] Fetching initial data for targetSharerId: ${targetSharerId}, user ID: ${user.id}`);
      
      const currentUserSharerId = user.app_metadata?.sharer_id;
      const isSharerContext = currentUserSharerId === targetSharerId;
      
      console.log(`[AttachmentUpload] Current User Sharer ID: ${currentUserSharerId}, Is Sharer Context: ${isSharerContext}`);

      try {
        const supabase = createClient();

        // Fetch Sharer's Profile details (firstName, lastName)
        if (isSharerContext) {
          // --- Sharer Context: Use user metadata ---
          console.log('[AttachmentUpload] Sharer context detected. Using user metadata.');
          setSharerFirstName(user.user_metadata?.firstName || 'Sharer');
          setSharerLastName(user.user_metadata?.lastName || '');
          setError(null); // Clear potential previous errors
        } else {
          // --- Executor Context: Use RPC ---
          console.log('[AttachmentUpload] Executor context detected. Using RPC get_sharer_details_for_executor.');
        const { data: sharerDetailsData, error: rpcError } = await supabase
          .rpc('get_sharer_details_for_executor', { p_sharer_id: targetSharerId })
            .maybeSingle();

        if (rpcError) {
          console.error(`[AttachmentUpload] RPC Error fetching sharer details for ${targetSharerId}:`, rpcError);
          setError(`Failed to load sharer data: ${rpcError.message}`);
          setSharerFirstName('Unknown');
          setSharerLastName('Sharer');
        } else if (!sharerDetailsData) {
          console.error(`[AttachmentUpload] RPC 'get_sharer_details_for_executor' returned no data for targetSharerId: ${targetSharerId}. Check RPC logic or data.`);
          setError("Could not find the specified Sharer profile via RPC. Access might be denied.");
          setSharerFirstName('Unknown');
          setSharerLastName('Sharer');
        } else {
          setError(null);
          console.log(`[AttachmentUpload] Fetched Sharer details via RPC for ${targetSharerId}:`, sharerDetailsData);
            setSharerFirstName(sharerDetailsData.profile_first_name || 'Unknown');
            setSharerLastName(sharerDetailsData.profile_last_name || 'Sharer');
          }
        }

        // Fetch Tags for the target Sharer
        try {
           const { data: tags, error: tagsError } = await supabase
             .from('PersonTag')
             .select('*')
             .eq('profileSharerId', targetSharerId);
           if (tagsError) throw tagsError;
           if (tags) {
              console.log(`[AttachmentUpload] Fetched ${tags.length} person tags for sharer ${targetSharerId}.`);
              setExistingTags(tags);
           } else {
              console.log(`[AttachmentUpload] No person tags found for sharer ${targetSharerId}.`);
              setExistingTags([]);
           }
        } catch (tagsError) {
           console.error(`[AttachmentUpload] Error fetching person tags for sharer ${targetSharerId}:`, tagsError);
           setExistingTags([]);
        } finally {
          setIsTagsLoading(false);
        }

        // Fetch PromptResponse -> Category (using promptResponseId - this part remains the same)
        try {
          const { data: responseDataArray, error: respErr } = await supabase
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
            .eq('id', promptResponseId);

          if (respErr) {
            console.error('[AttachmentUpload] Error fetching PromptResponse:', respErr);
            throw respErr;
          }

          if (!responseDataArray || responseDataArray.length === 0) {
            console.warn('[AttachmentUpload] No PromptResponse found for ID:', promptResponseId, '(Likely RLS issue)');
            setPromptCategory('untitled');
          } else {
            const responseData = responseDataArray[0];
            const cat = responseData.Prompt?.PromptCategory?.category || 'untitled';
            console.log(`[AttachmentUpload] Fetched prompt category: ${cat}`);
            setPromptCategory(cat);
          }
        } catch (responseFetchError) {
          console.error('[AttachmentUpload] Exception during PromptResponse fetch:', responseFetchError);
          setPromptCategory('untitled');
        }

      } catch (e) {
        console.error('[AttachmentUpload] Error during initial data fetch:', e);
        setError(e instanceof Error ? e.message : 'An unexpected error occurred loading data.');
        // Reset states on general error
        setSharerFirstName('Error');
        setSharerLastName('Loading');
        setExistingTags([]);
        setPromptCategory('unknown');
      } finally {
        setIsMetadataLoading(false); // Ensure metadata loading stops even if tags are still loading or failed
        // isTagsLoading is handled within its own try/finally
        console.log('[AttachmentUpload] Finished fetching initial data.');
      }
    }

    fetchInitialData();
  }, [isOpen, targetSharerId, supabase, promptResponseId, user, authLoading]);

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
    if (!newTagName || !newTagRelation || !profileSharerId) {
       toast.error("Missing name, relation, or sharer context for new tag.");
       console.error('[AttachmentUpload handleAddNewTag] Missing required info:', { newTagName, newTagRelation, profileSharerId });
       return;
    }

    setIsTagAddLoading(true);
    const supabase = createClient();

    try {
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
        console.error('Error creating tag:', error);
        return;
      }

      if (newTag) {
        setSelectedTags((prev) => [...prev, newTag]);
        setExistingTags((prev) => [...prev, newTag]);
        setNewTagName('');
        setNewTagRelation('');
        setIsAddingTag(false);
        toast.success(`Added tag: ${newTag.name}`);
      }
    } catch (error) {
      console.error('Error in handleAddNewTag:', error);
      toast.error('An error occurred while adding the tag');
    } finally {
      setIsTagAddLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Actually do the upload: final name, then insert
  // --------------------------------------------------------------------------
  const handleUpload = async (shouldClose: boolean = false) => {
    if (!files.length || !profileSharerId) {
       toast.error("No file selected or sharer context missing.");
       return;
    }

    setIsUploading(true);
    const supabase = createClient();

    try {
      // We'll create a new attachment record
      const attachmentId = crypto.randomUUID();

      // e.g. from "myphoto.JPG" => "jpg"
      const file = files[0];
      const fileExt = file.name.split('.').pop() || 'dat';

      // Build final name (which is also the storage path)
      const finalName = generateFinalFilename(
        sharerLastName,
        sharerFirstName,
        promptCategory,
        fileExt
      );
      const storagePath = finalName; // Explicitly define the path

      console.log(`[AttachmentUpload] Uploading file '${file.name}' to storage path: '${storagePath}' for sharer ${profileSharerId}`);

      const { error: uploadError } = await supabase
        .storage
        .from('attachments')
        .upload(storagePath, file); // Upload using the path

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      // Insert DB row using the storage path for fileUrl
      const attachmentRecord = {
        id: attachmentId,
        promptResponseId,
        profileSharerId,
        fileUrl: storagePath, // <-- STORE THE PATH HERE
        fileType: file.type,
        fileName: file.name, // Keep original filename for display/download purposes if needed
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
        // Add a toast to indicate the user can add more
        toast('You can now add another attachment', {
          description: 'The form has been reset for your next upload'
        });
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
  if (error) {
      return (
          <Dialog open={isOpen} onOpenChange={onClose}>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                  <DialogHeader className="pt-6 px-6 pb-4 border-b">
                      <DialogTitle>Error Loading Upload</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 flex items-center justify-center p-6">
                      <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Loading Failed</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                      </Alert>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={onClose} className="rounded-full">
                          Close
                      </Button>
                  </div>
              </DialogContent>
          </Dialog>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col"
        aria-describedby="attachment-upload-description"
      >
        <DialogHeader className="pt-6 px-6 pb-4 border-b">
          <DialogTitle>Upload Attachments</DialogTitle>
          <DialogDescription id="attachment-upload-description">
            Upload images or PDFs related to this response. Add optional details and tags.
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
                      // No need to check for 'pdf' here, revoke all object URLs
                      URL.revokeObjectURL(preview);
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
                    {/* Direct Preview Rendering Logic */}
                    {previews[0] && files[0].type.startsWith('image/') ? (
                      <img 
                        src={previews[0]} 
                        alt={`Preview of ${files[0].name}`} 
                        className="max-w-full max-h-full object-contain" 
                      />
                    ) : previews[0] && files[0].type === 'application/pdf' ? (
                      <div className="flex flex-col items-center text-gray-500">
                        <FileText className="h-16 w-16 mb-2" />
                        <span>PDF Selected</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                         <FileIcon className="h-16 w-16 mb-2" />
                         <span>File Selected</span>
                      </div>
                    )}
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
                {isTagsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#1B4332]"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading tags...</span>
                  </div>
                ) : (
                  <>
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
                        <SelectValue placeholder={existingTags.length > 0 ? "Select people..." : "No people tags found"} />
                      </SelectTrigger>
                      <SelectContent>
                        {existingTags.length > 0 ? (
                          existingTags.map((tag) => (
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
                          ))
                        ) : (
                          <div className="px-2 py-4 text-center text-sm text-gray-500">
                            No people tags found. Create one with "Add Person".
                          </div>
                        )}
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
                  </>
                )}
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
                    disabled={isTagAddLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNewTag}
                    disabled={!newTagName || !newTagRelation || isTagAddLoading}
                    className="rounded-full"
                  >
                    {isTagAddLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      <>Add Person</>
                    )}
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