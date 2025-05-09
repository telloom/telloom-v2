'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Pencil, Check, X, Info, Upload } from 'lucide-react';

import { type PromptResponse, type Video, type PromptResponseAttachment as ModelAttachment } from '@/types/models';

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

import { PromptResponseGallery } from '@/components/PromptResponseGallery';
import { VideoDownloadButton } from '@/components/video/VideoDownloadButton';

const AttachmentUpload = dynamic(() => import('@/components/AttachmentUpload'), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center p-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>,
});

interface PromptResponseWithRelations extends PromptResponse {
  videoId?: string | null;
  Video?: Video | null;
  PromptResponseAttachment?: ModelAttachment[] | null;
}

const videoResponseSchema = z.object({
  responseNotes: z.string().optional(),
  transcript: z.string().optional(),
  dateRecorded: z.string().optional(),
});

type VideoResponseFormData = z.infer<typeof videoResponseSchema>;

interface VideoResponseSectionProps {
  response: PromptResponseWithRelations;
  sharerName: string;
  promptCategoryName: string;
  onSaveSuccess?: (updatedResponse: PromptResponseWithRelations) => void;
}

export function VideoResponseSection({
  response,
  sharerName,
  promptCategoryName,
  onSaveSuccess,
}: VideoResponseSectionProps) {
  console.log(`[VideoResponseSection] Render. Received promptCategoryName: ${promptCategoryName}`);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAttachmentUploadOpen, setIsAttachmentUploadOpen] = useState(false);
  const [videoDetails, setVideoDetails] = useState<{
    dateRecorded: string | null;
    transcript: string | null;
  }>({
    dateRecorded: response.Video?.dateRecorded ?? null,
    transcript: response.Video?.VideoTranscript?.[0]?.transcript ?? null,
  });
  const [galleryKey, setGalleryKey] = useState(Date.now());

  const {
    handleSubmit,
    control,
    reset,
    formState: { isDirty },
  } = useForm<VideoResponseFormData>({
    resolver: zodResolver(videoResponseSchema),
    defaultValues: {
      responseNotes: response.responseNotes ?? '',
      transcript: response.Video?.VideoTranscript?.[0]?.transcript ?? '',
      dateRecorded: response.Video?.dateRecorded ?? '',
    },
  });

  useEffect(() => {
      reset({
        responseNotes: response.responseNotes ?? '',
      transcript: response.Video?.VideoTranscript?.[0]?.transcript ?? '',
      dateRecorded: response.Video?.dateRecorded ?? '',
      });
    setVideoDetails({
        dateRecorded: response.Video?.dateRecorded ?? null,
        transcript: response.Video?.VideoTranscript?.[0]?.transcript ?? null,
    });
  }, [response, reset]);

  const handleSave = async (data: VideoResponseFormData) => {
    setIsLoading(true);
    setError(null);
    console.log('Attempting to save data (backend action commented out):', data);

    await new Promise(resolve => setTimeout(resolve, 1000));
    const updatedResponseMock = {
      ...response,
        responseNotes: data.responseNotes,
      Video: response.Video ? {
        ...response.Video,
          dateRecorded: data.dateRecorded || null,
        VideoTranscript: response.Video.VideoTranscript ? [{
             ...response.Video.VideoTranscript[0],
             transcript: data.transcript || null
        }] : undefined
      } : undefined
    } as PromptResponseWithRelations;

    setVideoDetails({ dateRecorded: data.dateRecorded || null, transcript: data.transcript || null});
    reset(data);
    toast.success('Response update simulated successfully!');
        setIsEditing(false);
    onSaveSuccess?.(updatedResponseMock);
      setIsLoading(false);
  };

  const handleCancel = () => {
    reset({
      responseNotes: response.responseNotes ?? '',
      transcript: response.Video?.VideoTranscript?.[0]?.transcript ?? '',
      dateRecorded: response.Video?.dateRecorded ?? '',
    });
    setIsEditing(false);
    setError(null);
  };

  const handleAttachmentUploadSuccess = () => {
    console.log('Attachment upload successful.');
    setIsAttachmentUploadOpen(false);
    setGalleryKey(Date.now());
    toast.success(`Attachment added.`);
  };

  // Add logging here to inspect the response prop
  console.log('[VideoResponseSection] Rendering. Response prop:', JSON.stringify(response, null, 2));
  console.log('[VideoResponseSection] Checking condition for download button. response.Video:', response.Video);
  console.log('[VideoResponseSection] Mux Asset ID:', response.Video?.muxAssetId);

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
                    type="button"
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
                        className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''
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
                      type="button"
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="dateRecorded">Date Recorded</Label>
                  {response.Video?.muxAssetId && (
                    console.log(`[VideoResponseSection] Rendering VideoDownloadButton. Passing promptCategoryName: ${promptCategoryName}`),
                    <VideoDownloadButton 
                      muxAssetId={response.Video.muxAssetId}
                      videoType="prompt"
                      userId={response.profileSharerId}
                      promptCategoryName={promptCategoryName}
                    />
                  )}
                </div>
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
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">
              Related Attachments
            </CardTitle>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button
                   variant="outline"
                   size="sm"
                   type="button"
                   onClick={() => setIsAttachmentUploadOpen(true)}
                   className="rounded-full"
                 >
                   <Upload className="mr-2 h-4 w-4" />
                   Add Attachment
                 </Button>
               </TooltipTrigger>
               <TooltipContent>Upload new photos or documents</TooltipContent>
             </Tooltip>
          </CardHeader>
          <CardContent>
            <PromptResponseGallery promptResponseId={response.id} galleryKey={galleryKey} />
          </CardContent>
        </Card>

        <AttachmentUpload
          promptResponseId={response.id}
              targetSharerId={response.profileSharerId}
          isOpen={isAttachmentUploadOpen}
          onClose={() => setIsAttachmentUploadOpen(false)}
          onUploadSuccess={handleAttachmentUploadSuccess}
        />
      </form>
    </TooltipProvider>
  );
} 