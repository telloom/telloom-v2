import { VideoResponseSectionProps } from '@/types/models';
import { TopicVideoResponseSection } from '@/components/TopicVideoResponseSection';
import { toUIAttachment } from '@/types/component-interfaces';

export default function VideoResponseSection({ promptId, promptText, promptCategory, response }: VideoResponseSectionProps) {
  // Map the props from VideoResponseSectionProps to TopicVideoResponseSectionProps
  return (
    <TopicVideoResponseSection
      topicId={promptId}
      topicName={promptText}
      userId={response?.profileSharerId || null}
      video={response?.video ? {
        id: response.video.id,
        muxPlaybackId: response.video.muxPlaybackId,
        muxAssetId: response.video.muxAssetId,
        dateRecorded: response.video.dateRecorded,
        TopicVideoTranscript: response.video.VideoTranscript?.map(t => ({
          id: t.id,
          transcript: t.transcript
        })),
        summary: response?.summary || undefined
      } : undefined}
      attachments={response?.PromptResponseAttachment?.map(attachment => toUIAttachment({
        id: attachment.id,
        promptResponseId: attachment.promptResponseId,
        profileSharerId: attachment.profileSharerId,
        fileUrl: attachment.fileUrl,
        fileType: attachment.fileType,
        fileName: attachment.fileName,
        uploadedAt: new Date(attachment.uploadedAt),
        fileSize: attachment.fileSize,
        title: attachment.title,
        description: attachment.description,
        estimatedYear: attachment.estimatedYear,
        dateCaptured: attachment.dateCaptured ? new Date(attachment.dateCaptured) : null,
        yearCaptured: attachment.yearCaptured,
        PromptResponseAttachmentPersonTag: attachment.PromptResponseAttachmentPersonTag
      }))}
    />
  );
} 