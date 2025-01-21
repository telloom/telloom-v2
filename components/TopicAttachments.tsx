/**
 * File: components/TopicAttachments.tsx
 * Description: A component that displays all attachments from prompts and prompt responses in a topic category
 */

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';

interface Attachment {
  id: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  title: string;
  description: string;
  dateCaptured: string | null;
  yearCaptured: number | null;
  createdAt: string;
}

interface TopicAttachmentsProps {
  promptCategoryId: string;
}

export function TopicAttachments({ promptCategoryId }: TopicAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        // First get all prompts in this category
        const { data: prompts, error: promptError } = await supabase
          .from('Prompt')
          .select('id')
          .eq('promptCategoryId', promptCategoryId);

        if (promptError) throw promptError;

        // Get all prompt responses for these prompts
        const { data: responses, error: responseError } = await supabase
          .from('PromptResponse')
          .select('id')
          .in('promptId', prompts.map(p => p.id));

        if (responseError) throw responseError;

        // Get all attachments for these responses
        const { data: attachments, error: attachmentError } = await supabase
          .from('PromptResponseAttachment')
          .select('*')
          .in('promptResponseId', responses.map(r => r.id))
          .order('dateCaptured', { ascending: false })
          .order('createdAt', { ascending: false });

        if (attachmentError) throw attachmentError;

        setAttachments(attachments);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttachments();
  }, [promptCategoryId, supabase]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div>Loading attachments...</div>
      </Card>
    );
  }

  if (attachments.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-muted-foreground">No attachments found</div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="relative group">
              {attachment.fileType.startsWith('image/') ? (
                <div className="aspect-square relative overflow-hidden rounded-lg">
                  <Image
                    src={attachment.fileUrl}
                    alt={attachment.title || attachment.fileName}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    {attachment.fileName}
                  </span>
                </div>
              )}
              {(attachment.title || attachment.description) && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <div className="text-white text-sm">
                    {attachment.title && (
                      <p className="font-medium">{attachment.title}</p>
                    )}
                    {attachment.description && (
                      <p className="text-xs text-gray-300 line-clamp-2">
                        {attachment.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
} 