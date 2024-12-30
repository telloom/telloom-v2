'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingInterface } from '@/components/RecordingInterface';
import { VideoPopup } from '@/components/VideoPopup';
import { UploadPopup } from '@/components/UploadPopup';
import { ArrowLeft, Video as VideoIcon, Play, CheckCircle2, LayoutGrid, Table as TableIcon, Camera, Upload } from 'lucide-react';
import { PromptCategory, Prompt } from '@/types/models';
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
          setError('Could not find your sharer profile');
          return;
        }

        // Fetch PromptCategory with related data
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
                )
              )
            )
          `)
          .eq('id', topicId)
          .single();

        if (error) {
          console.error('Error fetching prompt category:', error);
          setError('Failed to load topic data');
          return;
        }

        if (!data) {
          console.error('No data returned from query');
          setError('No topic found');
          return;
        }

        // Transform the data to match our interface
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
                }] : []
              }))
          }))
        };

        setPromptCategory(transformedData);
      } catch (error) {
        console.error('Error:', error);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [topicId, router]);

  const handleVideoComplete = async (videoBlob: Blob) => {
    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('Error getting session:', sessionError);
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

      // Get upload URL from Mux
      const muxResp = await fetch('/api/mux/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(res => res.data.session?.access_token)}`
        },
        body: JSON.stringify({
          promptId: selectedPrompt?.id
        })
      });

      if (muxResp.status === 409) {
        const errorData = await muxResp.json();
        toast.error(errorData.error || 'A video for this prompt already exists');
        return; // Return early without throwing
      }

      if (!muxResp.ok) {
        const errorData = await muxResp.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { uploadUrl, uploadId } = await muxResp.json();

      if (!uploadUrl || !uploadId) {
        throw new Error('Invalid upload response from Mux');
      }

      // Upload the video bytes to Mux first
      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        body: videoBlob,
        headers: {
          'Content-Type': videoBlob.type,
        },
      });

      if (!uploadResp.ok) {
        throw new Error('Failed to upload video to Mux');
      }

      // Close the popup and clear selection
      setIsRecordingPopupOpen(false);
      setIsUploadPopupOpen(false);
      setSelectedPrompt(null);

      // Wait a moment for the webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh the data
      const { data: updatedCategory, error: updateError } = await supabase
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
              )
            )
          )
        `)
        .eq('id', topicId)
        .single();

      if (updateError || !updatedCategory) {
        console.error('Error updating category:', updateError);
        return;
      }

      // Transform and update state
      const transformedData: PromptCategory = {
        id: updatedCategory.id,
        category: updatedCategory.category || '',
        description: updatedCategory.description || '',
        theme: updatedCategory.theme,
        prompts: (updatedCategory.Prompt || []).map((prompt: any) => ({
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
              }] : []
            }))
        }))
      };

      setPromptCategory(transformedData);
    } catch (error) {
      console.error('Error completing video upload:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete video upload');
    }
  };

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
            <div className="text-sm font-medium">
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
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promptCategory.prompts.map((prompt: Prompt) => {
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
                      <CheckCircle2 className="h-5 w-5 text-[#8fbc55] flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <div className="flex items-center justify-between gap-3 mt-4">
                    {hasResponse && response?.videos[0]?.muxPlaybackId ? (
                      <Button
                        onClick={() => {
                          setSelectedPrompt(prompt);
                          setIsVideoPopupOpen(true);
                        }}
                        className="w-full bg-[#1B4332] hover:bg-[#1B4332]/90 text-white rounded-full font-medium h-auto py-2"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Watch Response
                      </Button>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Button
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsRecordingPopupOpen(true);
                          }}
                          className="flex-1 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white rounded-full font-medium h-auto py-2"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Record
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsUploadPopupOpen(true);
                          }}
                          variant="outline"
                          className="flex-1 border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332]/10 rounded-full font-medium h-auto py-2"
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
                <TableHead className="font-bold text-center">Status</TableHead>
                <TableHead className="font-bold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promptCategory.prompts.map((prompt) => {
                const hasResponse = prompt.promptResponses.length > 0 && 
                  prompt.promptResponses[0].videos.length > 0 && 
                  prompt.promptResponses[0].videos[0]?.muxPlaybackId;
                const response = hasResponse ? prompt.promptResponses[0] : null;
                
                return (
                  <TableRow key={prompt.id} className="hover:bg-gray-50/50 border-b border-[#1B4332] last:border-0">
                    <TableCell className="font-medium">{prompt.promptText}</TableCell>
                    <TableCell className="text-center">
                      {hasResponse ? (
                        <CheckCircle2 className="h-5 w-5 text-[#8fbc55] inline-block" />
                      ) : (
                        <div className="h-5 w-5" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {hasResponse && response?.videos[0]?.muxPlaybackId ? (
                        <Button
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsVideoPopupOpen(true);
                          }}
                          size="sm"
                          className="bg-[#1B4332] hover:bg-[#1B4332]/90"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Watch
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsRecordingPopupOpen(true);
                          }}
                          size="sm"
                          className="bg-[#1B4332] hover:bg-[#1B4332]/90"
                        >
                          <VideoIcon className="mr-2 h-4 w-4" />
                          Record
                        </Button>
                      )}
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
            onComplete={handleVideoComplete}
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
          onClose={() => {
            setIsUploadPopupOpen(false);
            setSelectedPrompt(null);
          }}
          promptText={selectedPrompt.promptText}
          promptId={selectedPrompt.id}
          onComplete={handleVideoComplete}
          onSave={handleVideoComplete}
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
    </div>
  );
}