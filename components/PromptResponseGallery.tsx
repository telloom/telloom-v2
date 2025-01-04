import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Tag, Calendar, FileText, ImageOff, Download, Edit2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface PromptResponseGallery {
  promptResponseId: string;
}

interface Attachment {
  id: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  description: string | null;
  dateCaptured: string | null;
  yearCaptured: number | null;
  personTags: {
    personTag: {
      id: string;
      name: string;
      relation: string;
    };
  }[];
}

export function PromptResponseGallery({ promptResponseId }: PromptResponseGallery) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<{
    description: string;
    dateCaptured: string;
    yearCaptured: string;
  }>({
    description: '',
    dateCaptured: '',
    yearCaptured: '',
  });

  useEffect(() => {
    const fetchAttachments = async () => {
      console.log('Fetching attachments for promptResponseId:', promptResponseId);
      const supabase = createClient();
      
      try {
        // First, check if we can access the PromptResponseAttachment table
        console.log('Checking PromptResponseAttachment table access...');
        const { data: testData, error: testError } = await supabase
          .from('PromptResponseAttachment')
          .select('id')
          .limit(1);

        if (testError) {
          console.error('Error accessing PromptResponseAttachment table:', testError);
          console.error('Error details:', {
            message: testError.message,
            details: testError.details,
            hint: testError.hint,
            code: testError.code
          });
          return;
        }

        console.log('Successfully accessed PromptResponseAttachment table');
        console.log('Fetching attachments with person tags...');
        
        const { data, error } = await supabase
          .from('PromptResponseAttachment')
          .select(`
            id,
            fileUrl,
            fileType,
            fileName,
            description,
            dateCaptured,
            yearCaptured,
            personTags:PromptResponseAttachmentPersonTag(
              personTag:PersonTag(
                id,
                name,
                relation
              )
            )
          `)
          .eq('promptResponseId', promptResponseId);

        if (error) {
          console.error('Error fetching attachments:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          return;
        }

        console.log('Successfully fetched attachments:', data);

        // Get signed URLs for each attachment
        console.log('Getting signed URLs for attachments...');
        const attachmentsWithUrls = await Promise.all(
          (data || []).map(async (attachment) => {
            try {
              // Always get a signed URL, even if it's already a full URL
              const { data: signedUrl } = await supabase
                .storage
                .from('attachments')
                .createSignedUrl(attachment.fileName, 3600);

              console.log('Got signed URL for attachment:', {
                id: attachment.id,
                fileName: attachment.fileName,
                signedUrl: signedUrl?.signedUrl
              });

              return {
                ...attachment,
                fileUrl: signedUrl?.signedUrl || attachment.fileUrl
              };
            } catch (error) {
              console.error('Error getting signed URL for attachment:', {
                id: attachment.id,
                fileName: attachment.fileName,
                error
              });
              return attachment;
            }
          })
        );

        console.log('Final attachments with URLs:', attachmentsWithUrls);
        setAttachments(attachmentsWithUrls);
      } catch (error) {
        console.error('Unexpected error in fetchAttachments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, [promptResponseId]);

  const handleImageError = (attachmentId: string) => {
    console.log('Image failed to load:', attachmentId);
    setImageErrors(prev => ({ ...prev, [attachmentId]: true }));
  };

  const handlePrevious = () => {
    if (selectedIndex === null || selectedIndex <= 0) return;
    setSelectedIndex(selectedIndex - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null || selectedIndex >= attachments.length - 1) return;
    setSelectedIndex(selectedIndex + 1);
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(attachment.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleEdit = () => {
    if (selectedIndex === null) return;
    const attachment = attachments[selectedIndex];
    setEditingAttachment({
      description: attachment.description || '',
      dateCaptured: attachment.dateCaptured || '',
      yearCaptured: attachment.yearCaptured?.toString() || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (selectedIndex === null) return;
    const attachment = attachments[selectedIndex];
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('PromptResponseAttachment')
        .update({
          description: editingAttachment.description || null,
          dateCaptured: editingAttachment.dateCaptured || null,
          yearCaptured: editingAttachment.yearCaptured ? parseInt(editingAttachment.yearCaptured) : null,
        })
        .eq('id', attachment.id);

      if (error) throw error;

      // Update local state
      const updatedAttachments = [...attachments];
      updatedAttachments[selectedIndex] = {
        ...attachment,
        description: editingAttachment.description || null,
        dateCaptured: editingAttachment.dateCaptured || null,
        yearCaptured: editingAttachment.yearCaptured ? parseInt(editingAttachment.yearCaptured) : null,
      };
      setAttachments(updatedAttachments);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating attachment:', error);
    }
  };

  if (loading) {
    return <div className="w-full h-32 flex items-center justify-center">Loading attachments...</div>;
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex justify-end">
      <div className="flex gap-0.5">
        {attachments.map((attachment, index) => (
          <div
            key={attachment.id}
            className="relative group cursor-pointer w-[32px] h-[32px] rounded-md overflow-hidden bg-gray-100"
            onClick={() => setSelectedIndex(index)}
          >
            {attachment.fileType.startsWith('image/') ? (
              imageErrors[attachment.id] ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <ImageOff className="h-2.5 w-2.5" />
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <img
                    src={attachment.fileUrl}
                    alt={attachment.fileName}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(attachment.id)}
                    loading="lazy"
                  />
                </div>
              )
            ) : attachment.fileType === 'application/pdf' ? (
              <div className="w-full h-full relative">
                <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center">
                  <FileText className="h-2.5 w-2.5 text-gray-400" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="h-2.5 w-2.5 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={selectedIndex !== null} onOpenChange={() => {
        setSelectedIndex(null);
        setIsEditing(false);
      }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-6 m-4 overflow-y-auto gallery-dialog">
          <VisuallyHidden>
            <DialogTitle>
              {selectedIndex !== null ? `Viewing ${attachments[selectedIndex].fileName}` : 'File Preview'}
            </DialogTitle>
          </VisuallyHidden>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              className="h-10 w-10 rounded-md bg-white hover:bg-gray-100 text-gray-700"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDownload(attachments[selectedIndex])}
              className="h-10 w-10 rounded-md bg-white hover:bg-gray-100 text-gray-700"
            >
              <Download className="h-4 w-4" />
            </Button>
            <button 
              type="button"
              onClick={() => setSelectedIndex(null)}
              className="h-10 w-10 inline-flex items-center justify-center rounded-md bg-white hover:bg-gray-100 text-gray-700"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <style jsx global>{`
            .gallery-dialog [data-state] {
              display: none !important;
            }
          `}</style>

          <div className="flex-1 flex flex-col min-h-0 mt-8">
            <div className="relative flex-1 flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={selectedIndex === null || selectedIndex <= 0}
                className="absolute left-4 z-10 h-10 w-10 rounded-md bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50 disabled:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {selectedIndex !== null && (
                <div className="w-full h-full flex flex-col">
                  <div className={`flex-1 flex items-center justify-center ${isEditing ? 'max-h-[50vh]' : 'max-h-[70vh]'}`}>
                    {attachments[selectedIndex].fileType.startsWith('image/') ? (
                      imageErrors[attachments[selectedIndex].id] ? (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <ImageOff className="h-16 w-16 mb-4" />
                          <span>Failed to load image</span>
                        </div>
                      ) : (
                        <img
                          src={attachments[selectedIndex].fileUrl}
                          alt={attachments[selectedIndex].fileName}
                          className="max-h-full w-auto object-contain"
                          onError={() => handleImageError(attachments[selectedIndex].id)}
                          loading="lazy"
                        />
                      )
                    ) : attachments[selectedIndex].fileType === 'application/pdf' ? (
                      <iframe
                        src={`${attachments[selectedIndex].fileUrl}#toolbar=0`}
                        className="w-full h-full"
                        title="PDF viewer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <FileText className="h-16 w-16 mb-4" />
                        <span>Preview not available</span>
                        <Button
                          variant="ghost"
                          onClick={() => handleDownload(attachments[selectedIndex])}
                          className="mt-4 bg-white hover:bg-gray-100 text-gray-700"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download File
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-white rounded-b-lg overflow-y-auto border-t">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={editingAttachment.description}
                            onChange={(e) => setEditingAttachment(prev => ({
                              ...prev,
                              description: e.target.value
                            }))}
                            placeholder="Add a description..."
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="dateCaptured">Date Captured</Label>
                            <Input
                              id="dateCaptured"
                              type="date"
                              value={editingAttachment.dateCaptured}
                              onChange={(e) => setEditingAttachment(prev => ({
                                ...prev,
                                dateCaptured: e.target.value
                              }))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="yearCaptured">Year (if exact date unknown)</Label>
                            <Input
                              id="yearCaptured"
                              type="number"
                              value={editingAttachment.yearCaptured}
                              onChange={(e) => setEditingAttachment(prev => ({
                                ...prev,
                                yearCaptured: e.target.value
                              }))}
                              placeholder="YYYY"
                              min="1800"
                              max={new Date().getFullYear()}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveEdit}>
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {attachments[selectedIndex].description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {attachments[selectedIndex].description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 items-center">
                          {attachments[selectedIndex].personTags?.map(({ personTag }) => (
                            <Badge key={personTag.id} variant="secondary" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {personTag.name} ({personTag.relation})
                            </Badge>
                          ))}

                          {(attachments[selectedIndex].dateCaptured || attachments[selectedIndex].yearCaptured) && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {attachments[selectedIndex].dateCaptured || attachments[selectedIndex].yearCaptured}
                            </Badge>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={selectedIndex === null || selectedIndex >= attachments.length - 1}
                className="absolute right-4 z-10 h-10 w-10 rounded-md bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50 disabled:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 