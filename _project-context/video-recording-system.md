# Video Recording System Architecture

## Overview

The video recording system in Telloom is designed to capture, process, and store video responses from users answering prompts about their life experiences. The system supports both direct recording through the browser and file uploads, with all videos being processed and hosted through Mux.

## Core Components

### 1. Recording Interface (`RecordingInterface.tsx`)
- Handles webcam access and video recording
- Features:
  - Camera and microphone device selection
  - 3-second countdown before recording starts
  - Live preview during recording
  - Recording controls (start, pause, end)
  - Video preview after recording
  - High-quality video settings (1080p, 30fps, 8Mbps bitrate)
  - Audio optimization (48kHz sample rate, stereo, echo cancellation)

### 2. Upload Interface (`UploadInterface.tsx`)
- Manages video file uploads
- Features:
  - Drag-and-drop file upload
  - Progress bar showing upload status
  - File type validation
  - Upload status messages
  - Preview of uploaded video

### 3. Video Processing Flow
1. **Initial Capture/Upload**
   - For recordings: Video is captured using MediaRecorder API
   - For uploads: File is validated and prepared for upload
   
2. **Pre-upload Processing**
   - Video is converted to a Blob
   - Quality checks are performed
   - Temporary local storage if needed

3. **Upload Process**
   - Request signed upload URL from backend
   - Create video record in database with status 'PROCESSING'
   - Direct upload to Mux using signed URL
   - Show progress during upload
   - Handle upload completion/errors

4. **Mux Processing States**
   - `preparing`: Initial state when asset is created
   - `ready`: Asset is ready for playback
   - `errored`: Asset failed to process
   - System polls Mux API until final state is reached

## Database Schema

### Video Table
- `id`: UUID (primary key)
- `muxPlaybackId`: String (Mux video identifier)
- `muxAssetId`: String (Mux asset identifier)
- `status`: Enum ('PREPARING', 'READY', 'ERRORED')
- `promptResponseId`: UUID (foreign key)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### PromptResponse Table
- `id`: UUID (primary key)
- `promptId`: UUID (foreign key)
- `profileSharerId`: UUID (foreign key)
- `responseText`: String (optional)
- `createdAt`: Timestamp

## API Endpoints

### `/api/mux/upload-url`
- **Method**: POST
- **Purpose**: Get secure upload URL from Mux
- **Requires**: 
  - `promptId`
  - `profileSharerId`
- **Returns**: 
  - `uploadUrl`
  - `videoId`

## State Management

### Recording States
1. `INITIAL`: Ready to start recording
2. `COUNTDOWN`: 3-second countdown active
3. `RECORDING`: Actively recording
4. `PAUSED`: Recording paused
5. `PREVIEW`: Showing recorded video
6. `PROCESSING`: Video being processed
7. `COMPLETE`: Video ready for viewing

### Upload and Processing States
1. `IDLE`: Initial state, ready for upload
2. `UPLOADING`: File transfer to Mux in progress
3. `PREPARING`: Mux initial processing state
4. `READY`: Video is processed and ready for playback
5. `ERRORED`: Upload or processing failed

### UI States During Upload
1. **Pre-upload**
   - Show upload interface
   - Display file selection/drag-drop area
   - Validate file type and size

2. **During Upload**
   - Show progress bar (0-100%)
   - Display cancel option
   - Show upload speed and remaining time
   - Handle network interruptions

3. **Processing**
   - Show "Processing video..." message
   - Display spinner or progress animation
   - Poll for status updates from Mux
   - Handle timeout scenarios

4. **Completion**
   - Show success message
   - Display video preview using MuxPlayer
   - Enable sharing/embedding options
   - Update UI to reflect completed state

## Error Handling

### Common Error Scenarios
1. Device permission denied
2. Network interruption
3. File type mismatch
4. File size limits
5. Processing failures
6. Timeout issues

### Error Recovery
- Automatic retries for transient failures
- Clear error messages to users
- Option to restart recording/upload
- Session persistence for recovery

## Security Considerations

1. **Access Control**
   - Authenticated endpoints
   - Secure upload URLs
   - User permission validation

2. **Data Protection**
   - Secure video storage
   - Encrypted transmission
   - Temporary file cleanup

3. **Resource Management**
   - Upload size limits
   - Processing timeouts
   - Rate limiting

## User Experience Features

1. **Visual Feedback**
   - Recording countdown
   - Progress indicators
   - Status messages
   - Processing animations

2. **Quality Assurance**
   - Preview before upload
   - Device selection
   - Quality settings
   - Retry options

3. **Accessibility**
   - Keyboard controls
   - Screen reader support
   - Clear status indicators
   - Error notifications

## Integration Points

### Frontend
- React components
- UI/UX elements
- State management
- Error handling

### Backend
- API endpoints
- Database operations
- Mux integration
- Authentication

### External Services
- Mux video processing
- Storage services
- CDN distribution

## Performance Optimization

1. **Video Capture**
   - Optimal codec selection
   - Quality vs. size balance
   - Memory management
   - Stream handling

2. **Upload Process**
   - Chunked uploads
   - Progress tracking
   - Network resilience
   - Background processing

3. **Playback**
   - Adaptive streaming
   - Quality selection
   - Buffer management
   - Load balancing

## Testing Considerations

1. **Unit Tests**
   - Component functionality
   - State management
   - Error handling
   - API integration

2. **Integration Tests**
   - End-to-end flows
   - Cross-browser compatibility
   - Network conditions
   - Error scenarios

3. **Performance Tests**
   - Upload speeds
   - Processing times
   - Memory usage
   - Browser compatibility

## Future Enhancements

1. **Planned Features**
   - Advanced editing capabilities
   - Batch uploads
   - Enhanced preview controls
   - Additional format support

2. **Optimization Opportunities**
   - Improved compression
   - Faster processing
   - Better error recovery
   - Enhanced monitoring

## Troubleshooting Guide

### Common Issues
1. Camera/microphone access
2. Upload failures
3. Processing delays
4. Playback problems

### Resolution Steps
1. Permission checks
2. Network diagnostics
3. Browser compatibility
4. Error log analysis

## Maintenance Procedures

1. **Regular Tasks**
   - Log monitoring
   - Performance checks
   - Storage cleanup
   - Version updates

2. **Emergency Procedures**
   - Service interruption
   - Data recovery
   - Error escalation
   - User communication 