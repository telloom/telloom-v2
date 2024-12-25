'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingInterface } from '@/components/RecordingInterface';
import { VideoPopup } from '@/components/VideoPopup';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Video as VideoIcon, Play, CheckCircle2, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { PromptCategory, Prompt } from '@/types/models';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TopicPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [promptCategory, setPromptCategory] = useState<PromptCategory | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState(false);
  const [isRecordingPopupOpen, setIsRecordingPopupOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  const supabase = createClient();

  useEffect(() => {
    const fetchPromptCategory = async () => {
      setError(null);
      setIsLoading(true);
      
      try {
        const session = await supabase.auth.getSession();
        const user = session.data.session?.user;
        
        if (!user) {
          console.error('No authenticated user found');
          router.push('/login');
          return;
        }

        // Get ProfileSharer record
        const { data: profileSharer, error: sharerError } = await supabase
          .from('ProfileSharer')
          .select('id')
          .eq('profileId', user.id)
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
          .eq('id', params.id)
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
        console.error('Error in fetchPromptCategory:', error);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromptCategory();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, params.id, router]);

  const handleVideoComplete = async (videoBlob: Blob) => {
    try {
      setIsRecordingPopupOpen(false);

      if (!selectedPrompt) {
        console.error('No prompt selected');
        return;
      }

      // Create a FormData object for the video
      const formData = new FormData();
      formData.append('video', videoBlob, 'recording.webm');

      // Get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return;
      }

      // Get ProfileSharer record
      const { data: profileSharer, error: sharerError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', user.id)
        .single();

      if (sharerError || !profileSharer) {
        console.error('Error fetching profile sharer:', sharerError);
        return;
      }

      // Create a new prompt response
      const { data: promptResponse, error: responseError } = await supabase
        .from('PromptResponse')
        .insert({
          promptId: selectedPrompt.id,
          profileSharerId: profileSharer.id,
          responseText: '',
        })
        .select()
        .single();

      if (responseError || !promptResponse) {
        console.error('Error creating prompt response:', responseError);
        return;
      }

      // Get upload URL from Mux
      const muxResp = await fetch('/api/mux/upload-url', {
        method: 'POST',
      });

      if (!muxResp.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, uploadId } = await muxResp.json();

      // Create video record in database
      const { data: video, error: videoError } = await supabase
        .from('Video')
        .insert({
          profileSharerId: profileSharer.id,
          muxUploadId: uploadId,
          promptId: selectedPrompt.id,
        })
        .select()
        .single();

      if (videoError || !video) {
        console.error('Error creating video record:', videoError);
        return;
      }

      // Upload the video bytes to Mux
      await fetch(uploadUrl, {
        method: 'PUT',
        body: videoBlob,
        headers: {
          'Content-Type': 'video/webm',
        },
      });

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
        .eq('id', params.id)
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
      setSelectedPrompt(null);
    } catch (error) {
      console.error('Error handling video upload:', error);
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
            <Badge variant="outline" className="px-4 py-2">
              {completedCount}/{totalCount} Completed
            </Badge>
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
            const hasResponse = prompt.promptResponses.length > 0;
            const response = prompt.promptResponses[0];
            
            return (
              <Card 
                key={prompt.id}
                className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 flex flex-col"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <Badge variant={prompt.isContextEstablishing ? "default" : "secondary"}>
                        {prompt.isContextEstablishing ? 'Context' : 'Follow-up'}
                      </Badge>
                      <CardTitle className="text-lg leading-tight">
                        {prompt.promptText}
                      </CardTitle>
                    </div>
                    {hasResponse && (
                      <CheckCircle2 className="h-5 w-5 text-[#8fbc55] flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <div className="flex items-center justify-between gap-3 mt-4">
                    {hasResponse && response.videos[0]?.muxPlaybackId ? (
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
                      <Button
                        onClick={() => {
                          setSelectedPrompt(prompt);
                          setIsRecordingPopupOpen(true);
                        }}
                        className="w-full bg-[#1B4332] hover:bg-[#1B4332]/90 text-white rounded-full font-medium h-auto py-2"
                      >
                        <VideoIcon className="mr-2 h-4 w-4" />
                        Record Response
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prompt</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promptCategory.prompts.map((prompt) => {
                const hasResponse = prompt.promptResponses.length > 0;
                const response = prompt.promptResponses[0];
                
                return (
                  <TableRow key={prompt.id}>
                    <TableCell className="font-medium">{prompt.promptText}</TableCell>
                    <TableCell>
                      <Badge variant={prompt.isContextEstablishing ? "default" : "secondary"}>
                        {prompt.isContextEstablishing ? 'Context' : 'Follow-up'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {hasResponse ? (
                        <Badge variant="default" className="bg-[#8fbc55]">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Not Started</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {hasResponse && response.videos[0]?.muxPlaybackId ? (
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
          isOpen={isRecordingPopupOpen}
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
            prompt={selectedPrompt}
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

      {/* Video Playback Popup */}
      {selectedPrompt && selectedPrompt.promptResponses[0]?.videos[0]?.muxPlaybackId && (
        <VideoPopup
          isOpen={isVideoPopupOpen}
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