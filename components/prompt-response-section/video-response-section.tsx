'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Pencil, Trash2, Check, X, Info } from 'lucide-react';

import { createClient } from '@/utils/supabase/client';
import { type Tables } from '@/lib/database.types';
import { type PromptResponseWithRelations } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { AttachmentUpload } from '@/components/attachment-upload/AttachmentUpload';
import { AttachmentGallery } from '@/components/attachment-gallery/AttachmentGallery';
import { AttachmentDialog } from '@/components/attachment-dialog/AttachmentDialog';
import { PersonTagSelector } from '@/components/person-tag-selector/PersonTagSelector';

import { updatePromptResponse } from '@/app/actions/prompt-responses';
import { generateSignedAttachmentUrl } from '@/app/actions/attachments';

type DbPromptResponseAttachment = Tables<'PromptResponseAttachment'> & {
  PersonTag?: Pick<Tables<'PersonTag'>, 'id' | 'name' | 'relation'>[];
};
type DbVideo = Tables<'Video'>;
type DbVideoTranscript = Tables<'VideoTranscript'>;
type DbPersonTag = Tables<'PersonTag'>;

interface UIAttachment {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  yearCaptured: string | null;
  uploadedAt: string;
  signedUrl?: string;
  promptResponseId: string;
  profileSharerId: string;
  PersonTag?: Pick<DbPersonTag, 'id' | 'name' | 'relation'>[]; 
}

function toUIAttachment(
  dbAttachment: DbPromptResponseAttachment,
  signedUrl?: string
): UIAttachment {
  return {
    id: dbAttachment.id,
    title: dbAttachment.title ?? dbAttachment.fileName,
    description: dbAttachment.description,
    fileName: dbAttachment.fileName,
    fileUrl: dbAttachment.fileUrl,
    fileType: dbAttachment.fileType,
    fileSize: dbAttachment.fileSize,
    yearCaptured: dbAttachment.dateCaptured,
    uploadedAt: dbAttachment.uploadedAt,
    signedUrl: signedUrl,
    promptResponseId: dbAttachment.promptResponseId,
    profileSharerId: dbAttachment.profileSharerId,
    PersonTag: dbAttachment.PersonTag || [],
  };
}

const videoResponseSchema = z.object({
  responseNotes: z.string().optional(),
  transcript: z.string().optional(),
  dateRecorded: z.string().optional(),
});

type VideoResponseFormData = z.infer<typeof videoResponseSchema>;

interface VideoResponseSectionProps {
  promptTitle: string;
  promptText: string;
  response: PromptResponseWithRelations;
  sharerName: string;
  onSaveSuccess?: (updatedResponse: PromptResponseWithRelations) => void;
}

export function VideoResponseSection({
  promptTitle,
  promptText,
  response,
  sharerName,
  onSaveSuccess,
}: VideoResponseSectionProps) {
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoDetails, setVideoDetails] = useState<{
    dateRecorded: string | null;
    transcript: string | null;
  }>({
    dateRecorded: response.video?.[0]?.dateRecorded ?? null,
    transcript: response.video?.[0]?.VideoTranscript?.[0]?.transcript ?? null,
  });
  const [attachments, setAttachments] = useState<UIAttachment[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<UIAttachment | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const {
    handleSubmit,
    control,
    reset,
    formState: { isDirty, errors },
  } = useForm<VideoResponseFormData>({
    resolver: zodResolver(videoResponseSchema),
    defaultValues: {
      responseNotes: response.responseNotes ?? '',
      transcript: videoDetails.transcript ?? '',
      dateRecorded: videoDetails.dateRecorded ?? '',
    },
  });

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const initialAttachments = response.PromptResponseAttachment || [];
      const attachmentsWithSignedUrls = await Promise.all(
        initialAttachments.map(async (att) => {
          const dbAttachment: DbPromptResponseAttachment = att;
          const signedUrlResult = await generateSignedAttachmentUrl(
            dbAttachment.fileUrl
          );
          if (signedUrlResult.error) {
            console.error(
              `Failed to get signed URL for ${dbAttachment.fileName}: ${signedUrlResult.error}`
            );
            return toUIAttachment(dbAttachment);
          }
          return toUIAttachment(dbAttachment, signedUrlResult.signedUrl);
        })
      );
      setAttachments(attachmentsWithSignedUrls);
      setVideoDetails({
        dateRecorded: response.video?.[0]?.dateRecorded ?? null,
        transcript: response.video?.[0]?.VideoTranscript?.[0]?.transcript ?? null,
      });
      reset({
        responseNotes: response.responseNotes ?? '',
        transcript:
          response.video?.[0]?.VideoTranscript?.[0]?.transcript ?? '',
        dateRecorded: response.video?.[0]?.dateRecorded ?? '',
      });
      setInitialDataLoaded(true);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError('Failed to load response details.');
      toast.error('Failed to load response details.');
    } finally {
      setIsLoading(false);
    }
  }, [response, reset]);

  useEffect(() => {
    if (!initialDataLoaded) {
      fetchInitialData();
    }
  }, [fetchInitialData, initialDataLoaded]);

  const handleSave = async (data: VideoResponseFormData) => {
    setIsLoading(true);
    setError(null);
    console.log('Saving data:', data);

    try {
      const updatePayload: Partial<Tables<'PromptResponse'>> & {
        video_update?: Partial<DbVideo>;
        transcript_update?: Partial<DbVideoTranscript>;
      } = {
        responseNotes: data.responseNotes,
      };

      if (response.videoId && response.video?.[0]) {
        const videoId = response.video[0].id;
        const transcriptId =
          response.video[0].VideoTranscript?.[0]?.id;

        updatePayload.video_update = {
          dateRecorded: data.dateRecorded || null,
        };

        if (transcriptId) {
          updatePayload.transcript_update = {
            transcript: data.transcript || null,
          };
    } else {
          console.warn('Transcript does not exist for this video.');
        }
      }

      const result = await updatePromptResponse(response.id, updatePayload);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        const updatedResponse = result.data as PromptResponseWithRelations;

        setVideoDetails({
          dateRecorded: updatedResponse.video?.[0]?.dateRecorded ?? null,
          transcript:
            updatedResponse.video?.[0]?.VideoTranscript?.[0]?.transcript ??
            null,
        });

        reset({
          responseNotes: updatedResponse.responseNotes ?? '',
          transcript:
            updatedResponse.video?.[0]?.VideoTranscript?.[0]?.transcript ?? '',
          dateRecorded: updatedResponse.video?.[0]?.dateRecorded ?? '',
        });

        toast.success('Response updated successfully!');
        setIsEditing(false);
        onSaveSuccess?.(updatedResponse);
      } else {
        throw new Error('No data returned after update.');
      }
    } catch (err: any) {
      console.error('Failed to save response:', err);
      setError(`Failed to save response: ${err.message}`);
      toast.error(`Failed to save response: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset({
      responseNotes: response.responseNotes ?? '',
      transcript: videoDetails.transcript ?? '',
      dateRecorded: videoDetails.dateRecorded ?? '',
    });
    setIsEditing(false);
    setError(null);
  };

  const handleAttachmentUploadSuccess = async (
    newAttachmentData: DbPromptResponseAttachment
  ) => {
    console.log('New attachment uploaded:', newAttachmentData);
    const signedUrlResult = await generateSignedAttachmentUrl(
      newAttachmentData.fileUrl
    );
    const newUIAttachment = toUIAttachment(
      newAttachmentData,
      signedUrlResult.error ? undefined : signedUrlResult.signedUrl
    );

    if (signedUrlResult.error) {
      console.error(
        `Failed to get signed URL for new attachment ${newAttachmentData.fileName}: ${signedUrlResult.error}`
      );
      toast.warning(
        `Attachment ${newAttachmentData.fileName} uploaded, but preview might be unavailable.`
      );
    }

    setAttachments((prev) => [...prev, newUIAttachment]);
    toast.success(`Attachment ${newAttachmentData.fileName} added.`);
  };

  const handleAttachmentDelete = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
    toast.success('Attachment deleted.');
    if (selectedAttachment?.id === attachmentId) {
      setIsDialogOpen(false);
      setSelectedAttachment(null);
    }
  };

  const handleAttachmentUpdate = (updatedAttachment: UIAttachment) => {
    setAttachments((prev) =>
      prev.map((att) =>
        att.id === updatedAttachment.id ? updatedAttachment : att
      )
    );
    setSelectedAttachment(updatedAttachment);
    toast.success('Attachment details updated.');
  };

  const handleThumbnailClick = (attachment: UIAttachment) => {
    console.log('Thumbnail clicked:', attachment);
    setSelectedAttachment(attachment);
    setIsDialogOpen(true);
  };

  if (isLoading && !initialDataLoaded) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
    );
  }

  if (error && !initialDataLoaded) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
        <Card className="border-2 border-gray-100 shadow-none">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">
              Video Response Details
            </CardTitle>
            {!isEditing ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                    aria-label="Edit response"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Response</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                      size="icon"
                      type="submit"
                      disabled={isLoading || !isDirty}
                      aria-label="Save changes"
                    >
                      <Check
                        className={`h-4 w-4 ${
                          isLoading ? 'animate-spin' : ''
                        }`}
                      />
                  </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save Changes</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                      size="icon"
                      onClick={handleCancel}
                      disabled={isLoading}
                      aria-label="Cancel editing"
                    >
                      <X className="h-4 w-4" />
                </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel</TooltipContent>
                </Tooltip>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Save Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
                <Label htmlFor="dateRecorded">Date Recorded</Label>
                {isEditing ? (
                  <Controller
                    name="dateRecorded"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="dateRecorded"
                        type="date"
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground pt-2">
                    {videoDetails.dateRecorded
                      ? new Date(videoDetails.dateRecorded).toLocaleDateString()
                      : 'Not set'}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="responseNotes">Notes</Label>
                {isEditing ? (
                  <Controller
                    name="responseNotes"
                    control={control}
                    render={({ field }) => (
              <Textarea
                        id="responseNotes"
                        placeholder={`Add any notes about ${sharerName}'s response...`}
                        rows={3}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-2">
                    {response.responseNotes || 'No notes provided.'}
                  </p>
            )}
          </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="transcript">Transcript</Label>
                {isEditing ? (
                  <Controller
                    name="transcript"
                    control={control}
                    render={({ field }) => (
              <Textarea
                        id="transcript"
                        placeholder="Video transcript..."
                        rows={10}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-2">
                    {videoDetails.transcript || 'No transcript available.'}
                  </p>
                )}
                  </div>
              </div>
          </CardContent>
        </Card>

        <Separator />

        <Card className="border-2 border-gray-100 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Related Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AttachmentGallery
              attachments={attachments}
              onThumbnailClick={handleThumbnailClick}
            />
        <AttachmentUpload
          promptResponseId={response.id}
              targetSharerId={response.profileSharerId}
          onUploadSuccess={handleAttachmentUploadSuccess}
        />
          </CardContent>
        </Card>

        {selectedAttachment && (
           <Suspense fallback={<Loader2 className="animate-spin" />}>
             <AttachmentDialog
              isOpen={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              attachment={selectedAttachment}
              onUpdate={handleAttachmentUpdate}
              onDelete={handleAttachmentDelete}
              sharerId={response.profileSharerId}
            />
           </Suspense>
        )}
      </form>
    </TooltipProvider>
  );
} 