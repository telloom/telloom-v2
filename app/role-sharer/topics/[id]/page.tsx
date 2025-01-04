'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingInterface } from '@/components/RecordingInterface';
import { VideoPopup } from '@/components/VideoPopup';
import { UploadPopup } from '@/components/UploadPopup';
import { ArrowLeft, Video as VideoIcon, Play, CheckCircle2, LayoutGrid, Table as TableIcon, Camera, Upload, Paperclip } from 'lucide-react';
import { PromptCategory, Prompt, PromptResponse, Video, PromptResponseAttachment } from '@/types/models';
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AttachmentUpload } from '@/components/AttachmentUpload';
import { PromptResponseGallery } from '@/components/PromptResponseGallery';

export default function TopicPage() {
  const router = useRouter();
  const params = useParams();
  const [topicId, setTopicId] = useState<string | null>(null);

  const [promptCategory, setPromptCategory] = useState<PromptCategory | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState(false);
  const [isRecordingPopupOpen, setIsRecordingPopupOpen] = useState(false);
  const [isUploadPopupOpen, setIsUploadPopupOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [sortByStatus, setSortByStatus] = useState(false);
  const [isAttachmentUploadOpen, setIsAttachmentUploadOpen] = useState(false);
  const [selectedPromptResponse, setSelectedPromptResponse] = useState<any>(null);

  useEffect(() => {
    if (params && typeof params.id === 'string') {
      setTopicId(params.id);
    } else {
      router.push('/role-sharer/topics');
    }
  }, [params, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!topicId) return;
      
      setIsLoading(true);
      try {
        console.log('Fetching data for topic:', topicId);
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.log('No session found, redirecting to login');
          router.push('/login');
          return;
        }

        console.log('Session found, user:', session.user.id);

        // Get ProfileSharer record
        const { data: profileSharer, error: sharerError } = await supabase
          .from('ProfileSharer')
          .select('id')
          .eq('profileId', session.user.id)
          .single();

        if (sharerError) {
          console.error('Error fetching profile sharer:', sharerError);
          setError('Could not find your sharer profile');
          return;
        }

        if (!profileSharer) {
          console.error('No profile sharer found for user:', session.user.id);
          setError('Could not find your sharer profile');
          return;
        }

        console.log('ProfileSharer found:', profileSharer.id);

        // Fetch PromptCategory with related data
        console.log('Fetching prompt category data...');
        const { data, error } = await supabase
          .from('PromptCategory')
          .select(`
            id,
            category,
            description,
            theme,
            Prompt (
              id,
              promptText,
              promptType,
              isContextEstablishing,
              promptCategoryId,
              PromptResponse (
                id,
                profileSharerId,
                responseText,
                Video (
                  id,
                  muxPlaybackId,
                  muxAssetId,
                  VideoTranscript (
                    transcript
                  )
                ),
                PromptResponseAttachment (
                  id,
                  fileUrl,
                  fileType,
                  fileName,
                  description,
                  dateCaptured,
                  yearCaptured
                )
              )
            )
          `)
          .eq('id', topicId)
          .single();

        if (error) {
          console.error('Error fetching prompt category:', error);
          setError(error.message);
          return;
        }

        if (!data) {
          console.error('No data found for topic:', topicId);
          setError('Topic not found');
          return;
        }

        console.log('Successfully fetched prompt category data:', data);

        // Transform the data with proper typing and avoid circular references
        const transformedData: PromptCategory = {
          id: data.id,
          category: data.category || '',
          description: data.description || '',
          theme: data.theme || '',
          prompts: (data.Prompt || []).map((prompt: any): Prompt => ({
            id: prompt.id,
            promptText: prompt.promptText || '',
            promptType: prompt.promptType || '',
            isContextEstablishing: prompt.isContextEstablishing || false,
            promptCategoryId: prompt.promptCategoryId || '',
            videos: [],
            promptResponses: (prompt.PromptResponse || [])
              .filter((response: any) => response.profileSharerId === profileSharer.id)
              .map((response: any): PromptResponse => ({
                id: response.id,
                summary: response.responseText || '',
                transcription: response.Video?.VideoTranscript?.transcript || '',
                videos: response.Video ? [{
                  id: response.Video.id,
                  muxPlaybackId: response.Video.muxPlaybackId
                }] : [],
                attachments: (response.PromptResponseAttachment || []).map((attachment: any): PromptResponseAttachment => ({
                  id: attachment.id,
                  promptResponseId: response.id,
                  fileUrl: attachment.fileUrl,
                  fileType: attachment.fileType,
                  fileName: attachment.fileName,
                  // Instead of creating a circular reference, we'll omit the promptResponse field
                  // since we already have access to it through the parent structure
                  promptResponse: null as any
                }))
              }))
          }))
        };

        console.log('Transformed data:', transformedData);
        setPromptCategory(transformedData);
      } catch (error: any) {
        console.error('Unexpected error:', error);
        setError(error?.message || 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [topicId, router]);

  const refreshData = useCallback(async () => {
    if (!topicId) return;
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // Get ProfileSharer record
      const { data: profileSharer, error: sharerError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', session.user.id)
        .single();

      if (sharerError || !profileSharer) {
        console.error('Error fetching profile sharer:', sharerError);
        return;
      }

      // Fetch updated data
      const { data, error } = await supabase
        .from('PromptCategory')
        .select(`
          id,
          category,
          description,
          theme,
          Prompt (
            id,
            promptText,
            promptType,
            isContextEstablishing,
            promptCategoryId,
            PromptResponse (
              id,
              profileSharerId,
              responseText,
              Video (
                id,
                muxPlaybackId,
                muxAssetId,
                VideoTranscript (
                  transcript
                )
              ),
              PromptResponseAttachment (
                id,
                fileUrl,
                fileType,
                fileName,
                title,
                description,
                dateCaptured,
                yearCaptured
              )
            )
          )
        `)
        .eq('id', topicId)
        .single();

      if (error || !data) {
        console.error('Error fetching updated data:', error);
        return;
      }

      // Transform the data
      const transformedData: PromptCategory = {
        id: data.id,
        category: data.category || '',
        description: data.description || '',
        theme: data.theme,
        prompts: (data.Prompt || []).map((prompt: any) => ({
          id: prompt.id,
          promptText: prompt.promptText,
          promptType: prompt.promptType || '',
          isContextEstablishing: prompt.isContextEstablishing || false,
          promptCategoryId: prompt.promptCategoryId || '',
          videos: [],
          promptResponses: (prompt.PromptResponse || [])
            .filter((response: any) => response.profileSharerId === profileSharer.id)
            .map((response: any) => ({
              id: response.id,
              summary: response.responseText || '',
              transcription: response.Video?.VideoTranscript?.[0]?.transcript || '',
              videos: response.Video ? [{
                id: response.Video.id,
                muxPlaybackId: response.Video.muxPlaybackId
              }] : [],
              attachments: response.PromptResponseAttachment || []
            }))
        }))
      };

      setPromptCategory(transformedData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [topicId, router]);

  const handleVideoComplete = useCallback(async (blob: Blob) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      // Get ProfileSharer record
      const { data: profileSharer } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', session.user.id)
        .single();

      if (!profileSharer) {
        throw new Error('Profile sharer not found');
      }

      // Get upload URL
      const uploadResponse = await fetch('/api/mux/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          promptId: selectedPrompt?.id,
          profileSharerId: profileSharer.id
        }),
      });

      let errorData;
      try {
        errorData = await uploadResponse.json();
      } catch (err) {
        console.error('Failed to parse error response:', err);
        errorData = {};
      }

      if (!uploadResponse.ok) {
        // If it's a conflict error, refresh the data to show the existing video
        if (uploadResponse.status === 409) {
          await refreshData();
          setIsRecordingPopupOpen(false);
          setIsUploadPopupOpen(false);
          setSelectedPrompt(null);
          return;
        }

        console.error('Upload URL error details:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          data: errorData
        });
        throw new Error(errorData.error || 'Failed to get upload URL. Please try again.');
      }

      let responseData = errorData;
      console.log('Upload URL response data:', responseData);

      if (!responseData?.uploadUrl) {
        console.error('Invalid upload URL response:', responseData);
        throw new Error('Invalid upload URL format received');
      }

      // Upload the video
      const uploadResult = await fetch(responseData.uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'video/webm',
        },
      });

      if (!uploadResult.ok) {
        const errorData = await uploadResult.json().catch(() => ({}));
        console.error('Upload error:', errorData);
        throw new Error(errorData.error || 'Failed to upload video. Please try again.');
      }

      // Start polling for video status
      const pollVideoStatus = async () => {
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes with 5-second intervals

        const checkStatus = async () => {
          const { data: video, error } = await supabase
            .from('Video')
            .select('status, muxPlaybackId')
            .eq('id', responseData.videoId)
            .single();

          if (error) {
            console.error('Error checking video status:', error);
            throw new Error('Failed to check video status');
          }

          if (video.status === 'READY' && video.muxPlaybackId) {
            // Video is ready
            return video.muxPlaybackId;
          }

          if (video.status === 'ERRORED') {
            throw new Error('Video processing failed');
          }

          if (attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            return checkStatus();
          } else {
            throw new Error('Video processing timed out');
          }
        };

        return checkStatus();
      };

      // Wait for video to be ready
      const muxPlaybackId = await pollVideoStatus();

      // Force a refresh of the prompts data
      await refreshData();
      
      return muxPlaybackId;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }, [selectedPrompt, refreshData]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please wait while we load your topic...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
            <Button className="mt-4" onClick={() => router.push('/role-sharer/topics')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Topics
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!promptCategory) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader>
            <CardTitle>No Topic Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This topic could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = promptCategory.prompts.filter(p => p.promptResponses.length > 0).length;
  const totalCount = promptCategory.prompts.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  const sortedPrompts = sortByStatus 
    ? [...promptCategory.prompts].sort((a, b) => {
        const aHasResponse = a.promptResponses.length > 0 && a.promptResponses[0].videos.length > 0;
        const bHasResponse = b.promptResponses.length > 0 && b.promptResponses[0].videos.length > 0;
        return bHasResponse ? 1 : aHasResponse ? -1 : 0;
      })
    : promptCategory.prompts;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Topics
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{promptCategory.category}</h1>
            <p className="text-gray-600 mt-2">{promptCategory.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-[#8fbc55] text-[#1B4332] px-4 py-1.5 rounded-full text-lg font-semibold">
              {completedCount}/{totalCount}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="ml-2"
            >
              {viewMode === 'grid' ? (
                <TableIcon className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <Progress 
            value={progressPercentage} 
            className="h-2 bg-[#E5E7EB] [&>[role=progressbar]]:bg-[#8fbc55]" 
          />
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPrompts.map((prompt: Prompt) => {
            const hasResponse = prompt.promptResponses.length > 0 && 
              prompt.promptResponses[0].videos.length > 0 && 
              prompt.promptResponses[0].videos[0]?.muxPlaybackId;
            const response = hasResponse ? prompt.promptResponses[0] : null;
            
            return (
              <Card 
                key={prompt.id}
                className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 flex flex-col"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-lg leading-tight">
                      {prompt.promptText}
                    </CardTitle>
                    {hasResponse && (
                      <CheckCircle2 className="h-6 w-6 text-[#8fbc55] flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <div className="flex flex-col gap-4">
                    {/* Gallery Component - Right aligned */}
                    {hasResponse && prompt.promptResponses[0].attachments && prompt.promptResponses[0].attachments.length > 0 && (
                      <div className="flex justify-end">
                        <PromptResponseGallery promptResponseId={prompt.promptResponses[0].id} />
                      </div>
                    )}
                    
                    {/* Buttons */}
                    {hasResponse && prompt.promptResponses[0]?.videos[0]?.muxPlaybackId ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsVideoPopupOpen(true);
                          }}
                          size="sm"
                          className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full flex-1"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Watch
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedPromptResponse(prompt.promptResponses[0]);
                            setIsAttachmentUploadOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1"
                        >
                          <Paperclip className="mr-1 h-4 w-4" />
                          {prompt.promptResponses[0].attachments?.length || 0}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsRecordingPopupOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1"
                        >
                          <VideoIcon className="mr-2 h-4 w-4" />
                          Record
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsUploadPopupOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-[#1B4332]">
                <TableHead className="font-bold">Prompt</TableHead>
                <TableHead 
                  className="font-bold text-center cursor-pointer hover:text-[#8fbc55]"
                  onClick={() => setSortByStatus(!sortByStatus)}
                >
                  Status {sortByStatus ? '↓' : '↑'}
                </TableHead>
                <TableHead className="font-bold text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPrompts.map((prompt) => {
                const hasResponse = prompt.promptResponses.length > 0 && 
                  prompt.promptResponses[0].videos.length > 0 && 
                  prompt.promptResponses[0].videos[0]?.muxPlaybackId;
                const response = hasResponse ? prompt.promptResponses[0] : null;
                
                return (
                  <TableRow key={prompt.id} className="hover:bg-gray-50/50 border-b border-[#1B4332] last:border-0">
                    <TableCell className="font-medium">{prompt.promptText}</TableCell>
                    <TableCell className="text-center">
                      {hasResponse ? (
                        <CheckCircle2 className="h-6 w-6 text-[#8fbc55] inline-block" />
                      ) : (
                        <div className="h-6 w-6" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasResponse && prompt.promptResponses[0]?.videos[0]?.muxPlaybackId ? (
                          <>
                            {/* Gallery Component */}
                            {prompt.promptResponses[0].attachments && prompt.promptResponses[0].attachments.length > 0 && (
                              <PromptResponseGallery promptResponseId={prompt.promptResponses[0].id} />
                            )}
                            <Button
                              onClick={() => {
                                setSelectedPrompt(prompt);
                                setIsVideoPopupOpen(true);
                              }}
                              size="sm"
                              className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full"
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Watch
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedPromptResponse(prompt.promptResponses[0]);
                                setIsAttachmentUploadOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
                            >
                              <Paperclip className="mr-1 h-4 w-4" />
                              {prompt.promptResponses[0].attachments?.length || 0}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => {
                                setSelectedPrompt(prompt);
                                setIsRecordingPopupOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1"
                            >
                              <VideoIcon className="mr-2 h-4 w-4" />
                              Record
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedPrompt(prompt);
                                setIsUploadPopupOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Recording Popup */}
      {isRecordingPopupOpen && selectedPrompt && (
        <VideoPopup
          open={isRecordingPopupOpen}
          onClose={() => {
            setIsRecordingPopupOpen(false);
            setSelectedPrompt(null);
          }}
          promptText={selectedPrompt.promptText}
          videoId=""
          onNext={() => {}}
          onPrevious={() => {}}
          hasNext={false}
          hasPrevious={false}
        >
          <RecordingInterface
            onCancel={() => {
              setIsRecordingPopupOpen(false);
              setSelectedPrompt(null);
            }}
            onClose={() => {
              setIsRecordingPopupOpen(false);
              setSelectedPrompt(null);
            }}
            onSave={handleVideoComplete}
          />
        </VideoPopup>
      )}

      {/* Upload Popup */}
      {isUploadPopupOpen && selectedPrompt && (
        <UploadPopup
          open={isUploadPopupOpen}
          onClose={() => setIsUploadPopupOpen(false)}
          promptText={selectedPrompt?.promptText}
          promptId={selectedPrompt?.id}
          onComplete={handleVideoComplete}
          onSave={handleVideoComplete}
          onUploadSuccess={() => {
            refreshData();
          }}
        />
      )}

      {/* Video Playback Popup */}
      {selectedPrompt && selectedPrompt.promptResponses[0]?.videos[0]?.muxPlaybackId && (
        <VideoPopup
          open={isVideoPopupOpen}
          onClose={() => {
            setIsVideoPopupOpen(false);
            setSelectedPrompt(null);
          }}
          promptText={selectedPrompt.promptText}
          videoId={selectedPrompt.promptResponses[0].videos[0].muxPlaybackId}
          onNext={() => {}}
          onPrevious={() => {}}
          hasNext={false}
          hasPrevious={false}
        />
      )}

      {/* Attachment Upload Dialog */}
      {selectedPromptResponse && (
        <AttachmentUpload
          promptResponseId={selectedPromptResponse.id}
          isOpen={isAttachmentUploadOpen}
          onClose={() => {
            setIsAttachmentUploadOpen(false);
            setSelectedPromptResponse(null);
          }}
          onUploadSuccess={() => {
            refreshData();
            setIsAttachmentUploadOpen(false);
            setSelectedPromptResponse(null);
          }}
        />
      )}
    </div>
  );
}