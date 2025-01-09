# Prompt Page Structure and Functionality

## Overview
The prompt page (`app/role-sharer/prompts/[id]/page.tsx`) is a dynamic route that displays a single prompt and allows users to record, upload, and manage video responses. It's a key part of the Telloom application where users share their personal histories through video responses to specific prompts.

## Component Structure

### Main Components
1. **PromptPage** (Parent Component)
   - Handles authentication and data fetching
   - Manages prompt navigation
   - Renders the prompt card and video response section

2. **VideoResponseSection** (Child Component)
   - Manages video recording/uploading
   - Handles transcript and summary editing
   - Manages attachments and image gallery

## Data Flow

### Data Fetching
1. **Authentication Check**
   ```typescript
   const { data: { user }, error: userError } = await supabase.auth.getUser();
   ```
   - Verifies user is authenticated
   - Checks user has SHARER or ADMIN role

2. **Prompt Data**
   ```typescript
   const { data: prompt } = await supabase
     .from('Prompt')
     .select(`
       id,
       promptText,
       promptType,
       isContextEstablishing,
       promptCategoryId,
       PromptCategory (id, category),
       PromptResponse (...)
     `)
   ```
   - Fetches prompt details
   - Includes related category and responses
   - Includes video and transcript data

3. **Sibling Prompts**
   - Fetches previous/next prompts in the same category
   - Enables prompt navigation

## Key Features

### 1. Video Response Management
- Record new video responses
- Upload existing videos
- View and play recorded videos using Mux Player
- Automatic transcription via Mux

### 2. AI Summary Generation
- Uses Replicate's Llama model
- Generates summaries based on:
  - Prompt text
  - Topic category
  - User's first name
  - Video transcript

### 3. Attachment Handling
- Upload and manage related attachments
- Image gallery with navigation
- Support for various file types

### 4. Navigation
- Back to topic navigation
- Previous/Next prompt navigation within category
- Context-establishing prompt indicators

## State Management

### Main States
1. **Loading State**
   ```typescript
   const [isLoading, setIsLoading] = useState(true);
   ```
   - Manages loading indicators during data fetching

2. **Error State**
   ```typescript
   const [error, setError] = useState<string | null>(null);
   ```
   - Handles error messages and error states

3. **Prompt Data State**
   ```typescript
   const [promptData, setPromptData] = useState<GetPromptDataResult | null>(null);
   ```
   - Stores fetched prompt data and related information

## Interface Definitions

### Key Interfaces
1. **Prompt Interface**
   ```typescript
   interface Prompt {
     id: string;
     promptText: string;
     promptType: string;
     isContextEstablishing: boolean;
     promptCategoryId: string;
     PromptCategory?: {
       id: string;
       category: string;
     };
     PromptResponse: PromptResponse[];
   }
   ```

2. **PromptResponse Interface**
   ```typescript
   interface PromptResponse {
     id: string;
     profileSharerId: string;
     summary: string | null;
     video?: {
       id: string;
       muxPlaybackId: string;
       VideoTranscript?: Array<{
         id: string;
         transcript: string;
       }>;
     };
   }
   ```

## UI Components

### Layout Structure
```tsx
<div className="container mx-auto py-8 space-y-8">
  <Card className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
    <CardHeader>
      <CardTitle>{prompt.promptText}</CardTitle>
    </CardHeader>
    <CardContent>
      <VideoResponseSection {...props} />
    </CardContent>
  </Card>
</div>
```

### Navigation Elements
- Back to Topic button
- Previous/Next prompt navigation
- Context-establishing indicator for starting prompts

## Error Handling

1. **Authentication Errors**
   - Redirects to login if unauthorized
   - Validates user roles and permissions

2. **Data Fetching Errors**
   - Graceful error states
   - User-friendly error messages
   - Fallback UI components

3. **Video Processing Errors**
   - Handles upload failures
   - Manages transcription errors
   - Provides retry mechanisms

## Best Practices

1. **Performance Optimization**
   - Dynamic imports for heavy components
   - Efficient state management
   - Optimized video loading

2. **User Experience**
   - Clear loading states
   - Intuitive navigation
   - Responsive design

3. **Security**
   - Role-based access control
   - Secure file uploads
   - Protected API routes

## Related Components
- `VideoResponseSection.tsx`
- `RecordingInterface.tsx`
- `UploadPopup.tsx`
- `MuxPlayer.tsx`
- `AttachmentUpload.tsx` 