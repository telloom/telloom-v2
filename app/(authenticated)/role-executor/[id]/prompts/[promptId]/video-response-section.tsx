import { VideoResponseSectionProps } from '@/types/models';
import TopicVideoResponseSection from '@/components/TopicVideoResponseSection';

export default function VideoResponseSection(props: VideoResponseSectionProps) {
  return (
    <TopicVideoResponseSection
      {...props}
      role="EXECUTOR"
    />
  );
} 