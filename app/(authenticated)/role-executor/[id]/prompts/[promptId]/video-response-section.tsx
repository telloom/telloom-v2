import { VideoResponseSectionProps } from '@/types/models';
import { TopicVideoResponseSection } from '@/components/TopicVideoResponseSection';

export default function VideoResponseSection({ promptId, promptText, promptCategory, response }: VideoResponseSectionProps) {
  // Map the props from VideoResponseSectionProps to TopicVideoResponseSectionProps
  return (
    <TopicVideoResponseSection
      topicId={promptId}
      topicName={promptText}
      userId={response?.profileSharerId || null}
      video={response?.video}
      attachments={response?.PromptResponseAttachment?.map(attachment => ({
        id: attachment.id,
        fileUrl: attachment.fileUrl,
        fileType: attachment.fileType,
        fileName: attachment.fileName,
        description: attachment.description || null,
        dateCaptured: attachment.dateCaptured || null,
        yearCaptured: attachment.yearCaptured || null,
        PersonTags: attachment.PromptResponseAttachmentPersonTag?.map(tag => tag.PersonTag).filter(Boolean) || []
      }))}
    />
  );
} 