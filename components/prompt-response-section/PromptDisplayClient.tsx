'use client';

import { useState, useCallback, useEffect, Suspense, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { type PromptResponse, type Video, type PromptResponseAttachment as ModelAttachment, type Prompt, type Profile } from '@/types/models';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Pencil, Check, X, Loader2, Wand2, Upload, VideoOff, Trash2 } from 'lucide-react';
import { PromptResponseGallery } from '@/components/PromptResponseGallery';
import { PageTitle } from '@/components/PageTitle';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ExpandableTextSection } from '@/components/ExpandableTextSection';
import { cleanTranscript } from '@/utils/cleanTranscript';
import { generateAISummary } from '@/utils/generateAISummary';
import {
  updatePromptResponseNotes,
  updatePromptResponseSummary,
  updateVideoTranscript,
  updateVideoDateRecorded,
  deletePromptResponseAndVideo
} from '@/components/prompt-response-section/prompt-response-actions';
import { VideoDownloadButton } from '@/components/video/VideoDownloadButton';
import { VideoResponseSection } from './video-response-section';
import { PromptActions } from '../../app/(authenticated)/role-sharer/prompts/[id]/prompt-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ExecutorSharerHeader } from '@/components/executor/ExecutorSharerHeader';

const AttachmentUpload = dynamic(() => import('@/components/AttachmentUpload').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center p-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>,
});

const DynamicMuxPlayer = dynamic(() => import('@/components/MuxPlayer').then(mod => mod.MuxPlayer), {
  ssr: false,
  loading: () => (
    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  ),
});

interface FullPromptResponse extends PromptResponse {
  Video?: Video & {
    VideoTranscript?: Array<{ id: string; transcript: string | null }> | null;
  } | null;
  PromptResponseAttachment?: ModelAttachment[] | null;
}

interface PromptWithDetails extends Prompt {
  promptTitle: string;
  promptCategoryId?: string | null;
  profileSharerId: string;
  PromptResponse?: FullPromptResponse[] | null;
  PromptCategory?: { category: string; id: string } | null;
}

interface SharerProfileHeaderData {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface PromptDisplayClientProps {
  initialPrompt: PromptWithDetails;
  sharerName: string;
  promptCategoryName: string;
  previousPromptId: string | null;
  nextPromptId: string | null;
  sharerIdFromResponse?: string | null;
  roleContext: 'SHARER' | 'EXECUTOR';
  contextSharerId?: string;
  sharerProfileHeaderData?: SharerProfileHeaderData | null;
}

export function PromptDisplayClient({
  initialPrompt,
  sharerName,
  promptCategoryName,
  previousPromptId,
  nextPromptId,
  sharerIdFromResponse,
  roleContext,
  contextSharerId,
  sharerProfileHeaderData
}: PromptDisplayClientProps) {
  const router = useRouter();
  const [promptData, setPromptData] = useState<PromptWithDetails>(initialPrompt);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiLoading, setAiLoading] = useState({ transcript: false, summary: false });
  const [aiActionSuccess, setAiActionSuccess] = useState<'transcript' | 'summary' | null>(null);
  const [isAttachmentUploadOpen, setIsAttachmentUploadOpen] = useState(false);
  const [galleryKey, setGalleryKey] = useState(Date.now());
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const promptResponse = promptData.PromptResponse?.[0];
  const video = promptResponse?.Video;
  const videoTranscript = video?.VideoTranscript?.[0];
  const playbackId = video?.muxPlaybackId;
  const muxAssetId = video?.muxAssetId;

  const [notes, setNotes] = useState(promptResponse?.responseNotes ?? '');
  const [transcript, setTranscript] = useState(videoTranscript?.transcript ?? '');
  const [summary, setSummary] = useState(promptResponse?.summary ?? '');
  const [dateRecorded, setDateRecorded] = useState(video?.dateRecorded ?? '');

  useEffect(() => {
    const newResponse = initialPrompt.PromptResponse?.[0];
    const newVideo = newResponse?.Video;
    const newTranscript = newVideo?.VideoTranscript?.[0];
    console.log(`[PromptDisplayClient useEffect] Received sharerIdFromResponse: ${sharerIdFromResponse}`);
    setPromptData(initialPrompt);
    setNotes(newResponse?.responseNotes ?? '');
    setTranscript(newTranscript?.transcript ?? '');
    setSummary(newResponse?.summary ?? '');
    setDateRecorded(newVideo?.dateRecorded ?? '');
    setIsEditingNotes(false);
    setIsEditingTranscript(false);
    setIsEditingSummary(false);
    setAiActionSuccess(null);
    setIsEditingDate(false);
    setGalleryKey(Date.now());
    setIsDeleting(false);
    if (roleContext === 'EXECUTOR' && !contextSharerId) {
        console.error('[PromptDisplayClient Error] contextSharerId is required when roleContext is EXECUTOR.');
    }
  }, [initialPrompt, sharerIdFromResponse, roleContext, contextSharerId]);

  const handleBackToTopic = () => {
    let path = '/role-sharer/topics';
    if (roleContext === 'EXECUTOR') {
        if (!contextSharerId) {
            console.error("Cannot determine back path: contextSharerId missing for executor.");
            toast.error("Navigation error.");
            return;
        }
        path = promptData.promptCategoryId
            ? `/role-executor/${contextSharerId}/topics/${promptData.promptCategoryId}`
            : `/role-executor/${contextSharerId}`;
    } else {
        if (promptData.promptCategoryId) {
            path = `/role-sharer/topics/${promptData.promptCategoryId}`;
        }
    }
    router.push(path);
  };

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    const targetPromptId = direction === 'prev' ? previousPromptId : nextPromptId;
    if (targetPromptId && !isNavigating) {
      setIsNavigating(true);
      let path = '';
      if (roleContext === 'EXECUTOR') {
          if (!contextSharerId) {
             console.error("Cannot navigate sibling: contextSharerId missing for executor.");
             toast.error("Navigation error.");
             setIsNavigating(false);
             return;
          }
          path = `/role-executor/${contextSharerId}/prompts/${targetPromptId}`;
      } else {
          path = `/role-sharer/prompts/${targetPromptId}`;
      }

      startTransition(() => {
        void router.push(path);
      });
    }
  }, [previousPromptId, nextPromptId, router, isNavigating, startTransition, roleContext, contextSharerId]);

  const handleSave = async (field: 'notes' | 'transcript' | 'summary' | 'date') => {
    setIsLoading(true);
    let originalValue: string | undefined;

    const formData = new FormData();
    let action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;

    try {
      switch (field) {
        case 'notes':
          if (!promptResponse?.id) throw new Error("Missing response ID");
          originalValue = promptResponse.responseNotes ?? '';
          formData.append('responseId', promptResponse.id);
          formData.append('notes', notes);
          action = updatePromptResponseNotes;
          break;
        case 'summary':
          if (!promptResponse?.id) throw new Error("Missing response ID");
          originalValue = promptResponse.summary ?? '';
          formData.append('responseId', promptResponse.id);
          formData.append('summary', summary);
          action = updatePromptResponseSummary;
          break;
        case 'transcript':
          if (!videoTranscript?.id) throw new Error("Missing transcript ID");
          originalValue = videoTranscript.transcript ?? '';
          formData.append('transcriptId', videoTranscript.id);
          formData.append('transcript', transcript);
          action = updateVideoTranscript;
          break;
        case 'date':
          if (!video?.id) throw new Error("Missing video ID");
          originalValue = video.dateRecorded ?? '';
          formData.append('videoId', video.id);
          formData.append('dateRecorded', dateRecorded);
          action = updateVideoDateRecorded;
          break;
        default:
            throw new Error('Invalid field type for saving');
      }

      const result = await action(formData);

      if (!result.success) {
        throw new Error(result.error || `Failed to update ${field}.`);
      }

      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully.`);

      if (field === 'notes') setIsEditingNotes(false);
      if (field === 'summary') setIsEditingSummary(false);
      if (field === 'transcript') setIsEditingTranscript(false);
      if (field === 'date') setIsEditingDate(false);

    } catch (error: any) {
      console.error(`Error saving ${field}:`, error);
      toast.error(`Failed to update ${field}.`, { description: error.message });
      switch(field) {
          case 'notes': setNotes(originalValue ?? ''); break;
          case 'transcript': setTranscript(originalValue ?? ''); break;
          case 'summary': setSummary(originalValue ?? ''); break;
          case 'date': setDateRecorded(originalValue ?? ''); break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = (field: 'notes' | 'transcript' | 'summary' | 'date') => {
    switch (field) {
      case 'notes':
        setNotes(promptResponse?.responseNotes ?? '');
        setIsEditingNotes(false);
        break;
      case 'transcript':
        setTranscript(videoTranscript?.transcript ?? '');
        setIsEditingTranscript(false);
        break;
      case 'summary':
        setSummary(promptResponse?.summary ?? '');
        setIsEditingSummary(false);
        break;
      case 'date':
        setDateRecorded(video?.dateRecorded ?? '');
        setIsEditingDate(false);
        break;
    }
  };

  const handleCleanTranscript = async () => {
    if (!transcript || !videoTranscript?.id) {
      toast.error('Cannot clean transcript without existing text and ID.');
      return;
    }
    setAiLoading(prev => ({ ...prev, transcript: true }));
    try {
      const cleaned = await cleanTranscript({
        transcript: transcript,
        transcriptId: videoTranscript.id,
        type: 'video'
      });
      setTranscript(cleaned);
      setAiActionSuccess('transcript');
      setTimeout(() => setAiActionSuccess(null), 3000);
    } catch (error) {
      console.error('Error cleaning transcript:', error);
      toast.error('Failed to clean transcript.', { description: error instanceof Error ? error.message : undefined });
    } finally {
      setAiLoading(prev => ({ ...prev, transcript: false }));
    }
  };

  const handleGenerateSummary = async () => {
    if (!transcript) {
      toast.error('Cannot generate summary without transcript text.');
      return;
    }
    if (!promptResponse?.id || !video?.id) {
      toast.error('Cannot generate summary without response ID and video ID.');
      return;
    }
    setAiLoading(prev => ({ ...prev, summary: true }));
    try {
      const generated = await generateAISummary({
        promptText: promptData.promptText,
        promptCategory: promptData.PromptCategory?.category ?? 'Unknown',
        firstName: sharerName.split(' ')[0],
        transcript: transcript,
        type: 'video',
        videoId: video.id
      });
      setSummary(generated);
      setAiActionSuccess('summary');
      setTimeout(() => setAiActionSuccess(null), 3000);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary.', { description: error instanceof Error ? error.message : undefined });
    } finally {
      setAiLoading(prev => ({ ...prev, summary: false }));
    }
  };

  const handleAttachmentUploadSuccess = useCallback(() => {
    console.log('Attachment upload successful, refreshing gallery data.');
    setIsAttachmentUploadOpen(false);
    toast.success(`Attachment added.`);
    router.refresh();
    setGalleryKey(prev => prev + 1);
  }, [router]);

  const handleDelete = async () => {
    if (!promptResponse?.id || !muxAssetId) {
      toast.error("Cannot delete: Missing response or video information.");
      return;
    }

    setIsDeleting(true);
    const formData = new FormData();
    formData.append('promptResponseId', promptResponse.id);
    formData.append('muxAssetId', muxAssetId);

    try {
      const result = await deletePromptResponseAndVideo(formData);

      if (result.success) {
        toast.success("Video recording deleted successfully.");
        handleBackToTopic();
      } else {
        throw new Error(result.error || 'Failed to delete video recording.');
      }
    } catch (error: any) {
      console.error("Error deleting video recording:", error);
      toast.error("Deletion failed.", { description: error.message });
      setIsDeleting(false);
    }
  };

  const effectiveSharerIdForDownload = roleContext === 'EXECUTOR' ? contextSharerId : sharerIdFromResponse;
  console.log(`[PromptDisplayClient] Effective Sharer ID for Download Button: ${effectiveSharerIdForDownload}`);

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 lg:px-32 py-8 max-w-7xl">
        {/* REMOVE Header from here */}
        {/* {roleContext === 'EXECUTOR' && sharerProfileHeaderData && (
          <div className="mb-6">
            <ExecutorSharerHeader sharerProfile={sharerProfileHeaderData} />
          </div>
        )} */}
        
        <div className="flex justify-between items-center mb-1">
          <Button variant="ghost" onClick={handleBackToTopic} className="-ml-2 rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => handleNavigate('prev')} disabled={!previousPromptId || isNavigating || isPending} className="rounded-full">
               <ArrowLeft className="mr-2 h-4 w-4" /> Previous
             </Button>
             <Button variant="outline" onClick={() => handleNavigate('next')} disabled={!nextPromptId || isNavigating || isPending} className="rounded-full">
               Next <ArrowLeft className="ml-2 h-4 w-4 transform rotate-180" />
            </Button>
          </div>
        </div>

        {/* ADD Header HERE, right before the main card */}
        {roleContext === 'EXECUTOR' && sharerProfileHeaderData && (
          <div className="mb-2">
            <ExecutorSharerHeader sharerProfile={sharerProfileHeaderData} />
          </div>
        )}
        
        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 rounded-2xl p-6 md:p-8 space-y-8 mb-12">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold mb-0">{promptData.promptText}</h2>
            {promptCategoryName && (
              <Badge variant="secondary" className="mt-2 inline-block">{promptCategoryName}</Badge>
            )}
          </div>

          <div className="rounded-lg overflow-hidden">
             {playbackId ? (
               <DynamicMuxPlayer playbackId={playbackId} />
             ) : (
               <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-muted-foreground">
                 No video response recorded yet.
               </div>
             )}
          </div>

          {video && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="dateRecorded" className="font-medium shrink-0">Date Recorded</Label>
                  {isEditingDate ? (
                     <div className="flex items-center gap-2">
                       <Input
                         id="dateRecorded"
                         type="date"
                         value={dateRecorded ? dateRecorded.split('T')[0] : ''}
                         onChange={(e) => setDateRecorded(e.target.value ? `${e.target.value}T00:00:00Z` : '')}
                         className="flex-grow [color-scheme:light]"
                         disabled={isLoading}
                       />
                       <Button size="icon" variant="ghost" onClick={() => handleSave('date')} disabled={isLoading} aria-label="Save date">
                         {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                       </Button>
                       <Button size="icon" variant="ghost" onClick={() => handleCancel('date')} disabled={isLoading} aria-label="Cancel editing date">
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                   ) : (
                     <div className="flex items-center gap-2">
                       <p className="text-sm text-muted-foreground">
                         {dateRecorded ? new Date(dateRecorded).toLocaleDateString() : 'Not set'}
                       </p>
                       <Button variant="ghost" size="icon" onClick={() => setIsEditingDate(true)} aria-label="Edit date">
                         <Pencil className="h-4 w-4" />
                       </Button>
                     </div>
                   )}
                </div>
                {muxAssetId && promptResponse && (
                   <VideoDownloadButton
                     muxAssetId={muxAssetId}
                     videoType="prompt"
                     userId={effectiveSharerIdForDownload}
                     promptCategoryName={promptCategoryName}
                   />
                )}
              </div>
            </div>
          )}

          {/* --- Attachments Section (Add Button) --- */}
          <div>
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-lg font-semibold">Attachments</h3>
              {promptResponse?.id && promptResponse?.profileSharerId && (
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
               )}
            </div>
            <div>
              {promptResponse?.id ? (
                 <PromptResponseGallery
                   promptResponseId={promptResponse.id}
                   galleryKey={galleryKey}
                 />
              ) : (
                 <div className="text-sm text-muted-foreground">No response ID available for attachments.</div>
              )}
            </div>
          </div>

          {/* --- Transcript Section --- */}
          <ExpandableTextSection
            title="Transcript"
            text={transcript}
            placeholder="No transcript available."
            isEditing={isEditingTranscript}
            isLoading={isLoading}
            aiLoading={aiLoading.transcript}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onEdit={() => setIsEditingTranscript(true)}
            onSave={() => handleSave('transcript')}
            onCancel={() => handleCancel('transcript')}
            aiButtonLabel="Clean Transcript"
            onAiAction={handleCleanTranscript}
            editModeRows={15}
            aiActionSuccess={aiActionSuccess === 'transcript'}
          />

          <ExpandableTextSection
            title="Summary"
            text={summary}
            placeholder="No summary generated yet."
            isEditing={isEditingSummary}
            isLoading={isLoading}
            aiLoading={aiLoading.summary}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onEdit={() => setIsEditingSummary(true)}
            onSave={() => handleSave('summary')}
            onCancel={() => handleCancel('summary')}
            aiButtonLabel="Generate Summary"
            onAiAction={handleGenerateSummary}
            editModeRows={8}
            aiActionSuccess={aiActionSuccess === 'summary'}
          />

          <div>
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Notes</h3>
                {!isEditingNotes ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsEditingNotes(true)} disabled={isLoading}><Pencil className="h-4 w-4" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit Notes</TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="flex items-center space-x-1">
                     <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleSave('notes')} disabled={isLoading}><Check className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Save Notes</TooltipContent></Tooltip>
                     <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-red-100" onClick={() => handleCancel('notes')} disabled={isLoading}><X className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Cancel</TooltipContent></Tooltip>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                {isEditingNotes ? (
                  <Textarea id="responseNotes" placeholder={`Add any notes about ${sharerName}'s response...`} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isLoading} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-1">{notes || 'No notes provided.'}</p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* --- Danger Zone --- */}
        {promptResponse && muxAssetId && (
            <div className="mt-12 p-6 border-t-2 border-red-600">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
                        <p className="text-sm text-red-600 mt-1">Deleting this video recording is permanent and cannot be undone. This will remove the video, transcript, summary, and notes.</p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                className="mt-4 sm:mt-0 sm:ml-4 rounded-full bg-red-600 hover:bg-red-700 text-white shrink-0"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                {isDeleting ? 'Deleting...' : 'Delete Video Recording'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the video recording, its transcript, summary, and notes. Any associated attachments will prevent deletion until they are removed first.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting} className="rounded-full">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDelete();
                                    }}
                                    disabled={isDeleting}
                                    className="bg-red-600 hover:bg-red-700 rounded-full"
                                >
                                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {isDeleting ? 'Deleting...' : 'Yes, delete it'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        )}

      {promptResponse?.id && promptResponse?.profileSharerId && (
        <AttachmentUpload
          promptResponseId={promptResponse.id}
          targetSharerId={promptResponse.profileSharerId}
          isOpen={isAttachmentUploadOpen}
          onClose={() => setIsAttachmentUploadOpen(false)}
          onUploadSuccess={handleAttachmentUploadSuccess}
        />
      )}
    </div>
  </TooltipProvider>
  );
} 