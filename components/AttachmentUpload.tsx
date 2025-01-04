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
import { person_relation } from '@prisma/client';
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

interface PersonTag {
  id: string;
  name: string;
  relation: person_relation;
}

interface AttachmentUploadProps {
  promptResponseId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export function AttachmentUpload({
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
  const [existingTags, setExistingTags] = useState<PersonTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<PersonTag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagRelation, setNewTagRelation] = useState<person_relation | ''>('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  // Fetch existing tags
  useEffect(() => {
    const fetchTags = async () => {
      console.log('Starting fetchTags...');
      try {
        const supabase = createClient();
        console.log('Supabase client created');
        
        // Log the current auth state
        const { data: authData, error: authError } = await supabase.auth.getSession();
        console.log('Auth state:', {
          hasSession: !!authData.session,
          accessToken: authData.session?.access_token ? 'present' : 'missing',
          userId: authData.session?.user?.id,
          headers: await supabase.auth.getSession().then(x => x.data.session?.access_token ? 
            { Authorization: `Bearer ${x.data.session.access_token}` } : 'no auth headers'),
          role: authData.session?.user?.role,
          aud: authData.session?.user?.aud
        });
        
        if (authError) {
          console.error('Auth check error:', authError);
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          return;
        }
        
        if (!session) {
          console.log('No active session found');
          return;
        }
        console.log('Session found:', { userId: session.user.id });

        console.log('Fetching ProfileSharer...');
        const { data: profileSharer, error: sharerError } = await supabase
          .from('ProfileSharer')
          .select('id')
          .eq('profileId', session.user.id)
          .single();

        if (sharerError) {
          console.error('Error fetching profile sharer:', sharerError);
          console.error('Full error details:', {
            message: sharerError.message,
            details: sharerError.details,
            hint: sharerError.hint,
            code: sharerError.code
          });
          return;
        }

        if (!profileSharer) {
          console.log('No profile sharer found for user:', session.user.id);
          return;
        }
        console.log('ProfileSharer found:', profileSharer);

        console.log('Preparing PersonTag query...');
        const query = supabase
          .from('PersonTag')
          .select('*')
          .eq('profileSharerId', profileSharer.id);
          
        console.log('Query details:', {
          table: 'PersonTag',
          filter: { profileSharerId: profileSharer.id },
          url: query.url?.toString(),
          headers: await supabase.auth.getSession().then(x => x.data.session?.access_token ? 
            { Authorization: `Bearer ${x.data.session.access_token}` } : 'no auth headers')
        });

        console.log('Executing PersonTag query...');
        const { data: tags, error: tagsError } = await query;

        if (tagsError) {
          console.error('Error fetching tags:', tagsError);
          console.error('Full error details:', {
            message: tagsError.message,
            details: tagsError.details,
            hint: tagsError.hint,
            code: tagsError.code,
            status: tagsError.status || 'no status'
          });
          return;
        }

        console.log('Tags fetched successfully:', tags);
        setExistingTags(tags || []);
      } catch (error) {
        console.error('Unexpected error in fetchTags:');
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        } else {
          console.error('Unknown error type:', error);
        }
      }
    };

    if (isOpen) {
      console.log('Dialog opened, initiating tag fetch...');
      fetchTags();
    }
  }, [isOpen]);

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

  const handleAddTag = async () => {
    console.log('Starting handleAddTag...');
    if (!newTagName || !newTagRelation) {
      console.log('Missing required fields:', { newTagName, newTagRelation });
      return;
    }

    const supabase = createClient();
    console.log('Checking session for tag creation...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error during tag creation:', sessionError);
      toast.error('Authentication error');
      return;
    }

    if (!session) {
      console.log('No active session found during tag creation');
      toast.error('Not authenticated');
      return;
    }
    console.log('Session found for tag creation:', { userId: session.user.id });

    console.log('Fetching ProfileSharer for tag creation...');
    const { data: profileSharer, error: profileError } = await supabase
      .from('ProfileSharer')
      .select('id')
      .eq('profileId', session.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile for tag creation:', profileError);
      console.error('Full profile error details:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code
      });
      toast.error('Profile not found');
      return;
    }

    if (!profileSharer) {
      console.log('No profile sharer found for tag creation, user:', session.user.id);
      toast.error('Profile not found');
      return;
    }
    console.log('ProfileSharer found for tag creation:', profileSharer);

    console.log('Creating new tag...');
    const { data: tag, error } = await supabase
      .from('PersonTag')
      .insert({
        name: newTagName,
        relation: newTagRelation,
        profileSharerId: profileSharer.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      console.error('Full tag creation error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      console.error('Attempted tag data:', {
        name: newTagName,
        relation: newTagRelation,
        profileSharerId: profileSharer.id
      });
      toast.error('Failed to create tag');
      return;
    }

    console.log('Tag created successfully:', tag);
    setExistingTags(prev => [...prev, tag]);
    setSelectedTags(prev => [...prev, tag]);
    setNewTagName('');
    setNewTagRelation('');
    setIsAddingTag(false);
    toast.success('Tag created successfully');
  };

  const handleUpload = async (shouldClose: boolean = true) => {
    if (!files.length) return;

    setIsUploading(true);
    const supabase = createClient();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // Get ProfileSharer record
      const { data: profileSharer } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', session.user.id)
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

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      // Create attachment record
      const { data: attachment, error: dbError } = await supabase
        .from('PromptResponseAttachment')
        .insert({
          promptResponseId,
          profileSharerId: profileSharer.id,
          fileUrl: publicUrl,
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Attachments</DialogTitle>
          <DialogDescription>
            Add photos and documents to share with your family
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
                    {previews[0] === 'pdf' ? (
                      <div className="flex items-center justify-center">
                        <FileText className="h-12 w-12 text-gray-400" />
                      </div>
                    ) : (
                      <img
                        src={previews[0]}
                        alt={files[0].name}
                        className="max-h-[280px] w-auto object-contain"
                      />
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
                    onValueChange={(value) => setNewTagRelation(value as person_relation)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(person_relation).map((relation) => (
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
                    onClick={handleAddTag}
                    disabled={!newTagName || !newTagRelation}
                    className="rounded-full"
                  >
                    Add
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
      </DialogContent>
    </Dialog>
  );
} 