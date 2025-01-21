// app/(authenticated)/role-sharer/topics/[id]/topic-summary/page.tsx

// app/(authenticated)/role-sharer/topics/[id]/topic-summary/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { MuxPlayer } from '@/components/MuxPlayer';
import AttachmentThumbnail from '@/components/AttachmentThumbnail';

export default function TopicSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const topicId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [topicVideo, setTopicVideo] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      // 1) fetch the TopicVideo if any
      // 2) fetch attachments for all prompts under this topic
      // ...setTopicVideo, setAttachments
      setIsLoading(false);
    }
    fetchData();
  }, [topicId]);

  if (isLoading) return <p>Loading topic summary...</p>;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <h1 className="text-2xl font-bold mb-4">Topic Summary</h1>

      {/* Show the TopicVideo if present */}
      {topicVideo ? (
        <Card className="p-4">
          <MuxPlayer playbackId={topicVideo.muxPlaybackId} />
          {/* Possibly show transcript, summary text, etc. */}
        </Card>
      ) : (
        <p>No Topic Video yet</p>
      )}

      {/* Show aggregated attachments */}
      <div>
        <h2 className="text-xl font-semibold mb-3">All Attachments for This Topic</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {attachments.map((att) => (
            <AttachmentThumbnail
              key={att.id}
              attachment={att}
              size="lg"
            />
          ))}
        </div>
      </div>
    </div>
  );
}