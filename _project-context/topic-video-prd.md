# Product Requirements Document (PRD): Topic-Level Video and Summary Page

## 1. Overview

We are adding a **TopicVideo** concept for each Topic (aka `PromptCategory`). A user with role **SHARER** (or **EXECUTOR**/**ADMIN** acting on behalf of that sharer) can create a single **TopicVideo** for each topic. This video appears in a new **TopicVideoCard** at the top of the topic page. We also add a **Topic Summary** page that looks similar to an existing prompt-level page, but shows the TopicVideo plus aggregated attachments from all prompts in that topic.

### Key Goals
1. **TopicVideoCard**:  
   - Placed **above** the existing prompt cards (but **below** the topic description).  
   - Allows uploading or watching a single video for the entire topic.  
   - Provides an “Add/Manage Attachments” button for topic-level attachments if desired in the future (though for now we can replicate the same style from the prompt-level attachments interface).
2. **Topic Summary Page** (`/app/(authenticated)/role-sharer/topics/[id]/topic-summary/page.tsx`):  
   - **Similar** to the prompt-level “response” page at `/app/(authenticated)/role-sharer/prompts/[id]/page.tsx`.  
   - Displays the **TopicVideo** in the main video area instead of a prompt-based video.  
   - Lists **all attachments** from **all** prompts in this topic, effectively grouping them by the `PromptCategory` instead of per prompt.

## 2. User Flow

1. **Visiting a Topic** (`.../topics/[id]/page.tsx`):
   - The user sees the **TopicVideoCard** at the top.
     - If no TopicVideo is found, they see “Record” or “Upload” buttons (similar to `PromptActions`).
     - If a TopicVideo exists, they see a “Watch” button (playing in a `VideoPopup`) and optionally an “Attachments” button if we decide to manage topic-level attachments here.
2. **Topic Summary** (`.../topics/[id]/topic-summary/page.tsx`):
   - Mirrors the design of `prompts/[id]/page.tsx`.
   - Shows the **TopicVideo** in place of the prompt response video.
   - Shows a “gallery” style display of **all** attachments from **all** prompt responses under this topic.

## 3. Detailed Requirements

### 3.1 TopicVideo RLS / DB
- **(Already implemented via the new RLS + partial uniqueness)**  
- **One** `TopicVideo` row per `(profileSharerId, promptCategoryId)`, but `promptCategoryId` can be null if needed.  

### 3.2 TopicVideoCard Component
Create a **TopicVideoCard** that replicates the user experience from the existing `PromptActions` or `VideoResponseSection`. Specifically:

1. **Placement**: In `app/(authenticated)/role-sharer/topics/[id]/page.tsx`, **above** the existing prompts listing, **below** the topic’s description.  
2. **Appearance**:
   - Has a heading or short label like “Topic Video”.
   - If no video: show **Record** or **Upload**.  
   - If video exists: show **Watch** (which opens a `VideoPopup`) and possibly “Attachments” (if desired) or “View All Topic Attachments.”  
   - Matches the styling of the existing “prompt” cards (rounded edges, the same color scheme, etc.).
3. **Behavior**:
   - Clicking **Record** => opens the same `RecordingInterface` in a popup (like `PromptActions`).
   - Clicking **Upload** => opens the same `UploadPopup`.
   - Clicking **Watch** => uses `VideoPopup` with `MuxPlayer` to watch the existing `TopicVideo`.
   - Clicking “View Attachments” => uses the same approach as `AttachmentUpload` or a gallery style for the entire topic (optional).

**Example** (pseudo-code snippet):
```tsx
// /app/(authenticated)/role-sharer/topics/[id]/TopicVideoCard.tsx
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Video as VideoIcon, Upload, Paperclip } from 'lucide-react';
import { VideoPopup } from '@/components/VideoPopup';
import { RecordingInterface } from '@/components/RecordingInterface';
import { UploadPopup } from '@/components/UploadPopup';
import { AttachmentUpload } from '@/components/AttachmentUpload';

interface TopicVideoCardProps {
  topicId: string;
  hasVideo: boolean;
  topicVideoId?: string;   // or Mux Playback ID, etc.
  attachmentCount?: number;
  // ...other props you need (title, etc.)
}

export function TopicVideoCard({ topicId, hasVideo, topicVideoId, attachmentCount }: TopicVideoCardProps) {
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [showRecording, setShowRecording] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);

  return (
    <div className="p-4 bg-white border border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg">
      <h2 className="text-lg font-semibold mb-3">Topic Video</h2>

      {hasVideo ? (
        <>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowVideoPopup(true)}
              className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full"
            >
              <Play className="mr-2 h-4 w-4" />
              Watch
            </Button>
            <Button
              onClick={() => setShowAttachmentUpload(true)}
              variant="outline"
              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
            >
              <Paperclip className="mr-2 h-4 w-4" />
              {attachmentCount || 0} Attachments
            </Button>
          </div>

          {showVideoPopup && (
            <VideoPopup
              open={showVideoPopup}
              onClose={() => setShowVideoPopup(false)}
              promptText={"Topic Video"}  // or topic name
              videoId={topicVideoId}
            />
          )}
          {showAttachmentUpload && (
            <AttachmentUpload
              // or create a new "TopicAttachmentUpload" if needed
              promptResponseId={"some-fake-id"}  // or handle differently for topic-level attachments
              isOpen={showAttachmentUpload}
              onClose={() => setShowAttachmentUpload(false)}
              onUploadSuccess={() => {/* refresh, etc. */}}
            />
          )}
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowRecording(true)}
              variant="outline"
              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
            >
              <VideoIcon className="mr-2 h-4 w-4" />
              Record
            </Button>
            <Button
              onClick={() => setShowUpload(true)}
              variant="outline"
              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>

          {showRecording && (
            <RecordingInterface
              promptId={"fakePromptId"}  // or handle topic-based logic
              onClose={() => setShowRecording(false)}
            />
          )}
          {showUpload && (
            <UploadPopup
              open={showUpload}
              onClose={() => setShowUpload(false)}
              promptId={"fakePromptId"}  // or handle topic-based logic
              onUploadSuccess={(muxId) => {
                // handle success, set hasVideo = true, etc.
              }}
            />
          )}
        </>
      )}
    </div>
  );
}