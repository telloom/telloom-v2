'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingInterface } from '@/components/RecordingInterface';
import { VideoPopup } from '@/components/VideoPopup';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Image as ImageIcon, Edit, Play, Camera, Upload } from 'lucide-react';
import { Video, PromptResponse, Prompt, PromptCategory } from '@/types/models';
import { supabase } from '@/utils/supabase/client';
import { UploadPopup } from '@/components/UploadPopup';

// Add interface for the database response types
interface DatabasePromptResponse {
  id: string;
  profileSharerId: string;
  summary: string | null;
  transcription: string | null;
  video: {
    id: string;
    muxPlaybackId: string | null;
    muxAssetId: string | null;
  } | null;
  PromptResponseAttachment?: {
    id: string;
    fileUrl: string;
  }[];
}

interface DatabasePrompt {
  id: string;
  promptText: string;
  promptType: string;
  isContextEstablishing: boolean;
  promptCategoryId: string;
  PromptResponse?: DatabasePromptResponse[];
}

interface DatabasePromptCategory {
  id: string;
  category: string | null;
  description: string | null;
  theme: string | null;
  Prompt?: DatabasePrompt[];
}

interface SupportingImage {
  id: string;
  url: string;
}

interface ExtendedPromptResponse extends PromptResponse {
  transcription?: string | null;
  supportingImages?: SupportingImage[];
}

export default function TopicPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [promptCategory, setPromptCategory] = useState<PromptCategory | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromptCategory = async () => {
      try {
        setError(null);
        console.log('Fetching data...');

        // 1) Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('No user found or error:', userError);
          setError('You must be logged in to view this page');
          router.push('/unauthorized');
          return;
        }
        console.log('User found:', user.id);

        // 2) Get ProfileSharer record
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
        console.log('ProfileSharer found:', profileSharer.id);

        // 3) Fetch PromptCategory with related data
        //    Use "video:videoId(...)" for single-video references
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
                summary,
                transcription,
                video:videoId (
                  id,
                  muxPlaybackId,
                  muxAssetId
                ),
                PromptResponseAttachment (
                  id,
                  fileUrl
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
        console.log('Raw data:', data);

        // 4) Transform DB data to match our interface
        const transformedData: PromptCategory = {
          id: data.id,
          category: data.category || '',
          description: data.description || '',
          prompts: (data.Prompt || []).map((prompt) => {
            const typedPrompt = prompt as unknown as DatabasePrompt;
            return {
              id: typedPrompt.id,
              promptText: typedPrompt.promptText,
              promptType: typedPrompt.promptType,
              isContextEstablishing: typedPrompt.isContextEstablishing,
              promptCategoryId: typedPrompt.promptCategoryId,
              promptResponses: (typedPrompt.PromptResponse || [])
                .filter((response) => response.profileSharerId === profileSharer.id)
                .map((response) => {
                  const typedResponse = response as unknown as DatabasePromptResponse;
                  return {
                    id: typedResponse.id,
                    profileSharerId: typedResponse.profileSharerId,
                    videoId: typedResponse.video?.id || '',
                    responseText: typedResponse.summary || '',
                    privacyLevel: 'private',
                    video: typedResponse.video ? {
                      id: typedResponse.video.id,
                      profileSharerId: typedResponse.profileSharerId,
                      muxPlaybackId: typedResponse.video.muxPlaybackId || '',
                      duration: 0,
                      promptResponses: [],
                      profileSharer: null,
                      viewedBy: []
                    } : undefined,
                    transcription: typedResponse.transcription,
                    supportingImages: typedResponse.PromptResponseAttachment?.map(att => ({
                      id: att.id,
                      url: att.fileUrl
                    }))
                  };
                }),
              videos: []
            };
          })
        };

        console.log('Transformed data:', transformedData);
        setPromptCategory(transformedData);
      } catch (err) {
        console.error('Unexpected error in fetchPromptCategory:', err);
        setError('An unexpected error occurred while loading the page.');
      }
    };

    fetchPromptCategory();
  }, [router, params.id]);

  // Re-fetch prompt category for updated data (after uploads, etc.)
  const refreshPromptCategory = async () => {
    try {
      // 1) Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return;
      }

      // 2) Get ProfileSharer
      const { data: profileSharer, error: sharerError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', user.id)
        .single();
      if (sharerError || !profileSharer) {
        console.error('Error fetching profile sharer:', sharerError);
        return;
      }

      // 3) Query with single-video approach
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
              summary,
              transcription,
              video:videoId (
                id,
                muxPlaybackId,
                muxAssetId
              ),
              PromptResponseAttachment (
                id,
                fileUrl
              )
            )
          )
        `)
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error updating prompt category:', error);
        return;
      }

      if (data) {
        // 4) Transform again
        const transformedData: PromptCategory = {
          id: data.id,
          category: data.category || '',
          description: data.description || '',
          prompts: (data.Prompt || []).map((prompt) => {
            const typedPrompt = prompt as unknown as DatabasePrompt;
            return {
              id: typedPrompt.id,
              promptText: typedPrompt.promptText,
              promptType: typedPrompt.promptType,
              isContextEstablishing: typedPrompt.isContextEstablishing,
              promptCategoryId: typedPrompt.promptCategoryId,
              promptResponses: (typedPrompt.PromptResponse || [])
                .filter((response) => response.profileSharerId === profileSharer.id)
                .map((response) => {
                  const typedResponse = response as unknown as DatabasePromptResponse;
                  return {
                    id: typedResponse.id,
                    profileSharerId: typedResponse.profileSharerId,
                    videoId: typedResponse.video?.id || '',
                    responseText: typedResponse.summary || '',
                    privacyLevel: 'private',
                    video: typedResponse.video ? {
                      id: typedResponse.video.id,
                      profileSharerId: typedResponse.profileSharerId,
                      muxPlaybackId: typedResponse.video.muxPlaybackId || '',
                      duration: 0,
                      promptResponses: [],
                      profileSharer: null,
                      viewedBy: []
                    } : undefined,
                    transcription: typedResponse.transcription,
                    supportingImages: typedResponse.PromptResponseAttachment?.map(att => ({
                      id: att.id,
                      url: att.fileUrl
                    }))
                  };
                }),
              videos: []
            };
          })
        };
        setPromptCategory(transformedData);
      }
    } catch (err) {
      console.error('Unexpected error in refreshPromptCategory:', err);
    }
  };

  // Identify the current prompt & response with proper type safety
  const currentPrompt = promptCategory?.prompts[currentPromptIndex];
  const currentResponse = currentPrompt?.promptResponses[0] as ExtendedPromptResponse | undefined;

  //
  // ----- Pagination -----
  //
  const handleNext = () => {
    if (!promptCategory) return;
    if (currentPromptIndex < promptCategory.prompts.length - 1) {
      setCurrentPromptIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPromptIndex > 0) {
      setCurrentPromptIndex((prev) => prev - 1);
    }
  };

  //
  // ----- Recording -----
  //
  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleVideoComplete = async (videoBlob: Blob) => {
    try {
      setIsRecording(false);

      if (!currentPrompt) {
        console.error('No current prompt found');
        return;
      }

      // Get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return;
      }

      // Create a new prompt response
      const { data: promptResponse, error: responseError } = await supabase
        .from('PromptResponse')
        .insert({
          promptId: currentPrompt.id,
          profileId: user.id,
          summary: '',
          transcription: '',
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
          promptResponseId: promptResponse.id,
          muxUploadId: uploadId,
          status: 'uploading',
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

      // Refresh the prompt category data
      await refreshPromptCategory();
      handleNext();
    } catch (error) {
      console.error('Error handling video upload:', error);
    }
  };

  const handleVideoSave = async (videoBlob: Blob) => {
    // This is handled in handleVideoComplete
  };

  //
  // ----- Image Upload -----
  //
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return;

    if (!currentPrompt?.promptResponses[0]) return;

    try {
      // Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('supporting-images')
        .upload(`${user.id}/${Date.now()}-${file.name}`, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('supporting-images')
        .getPublicUrl(uploadData.path);

      // Insert image into DB (assuming you have "SupportingImage" or "PromptResponseAttachment" table)
      await supabase.from('SupportingImage').insert({
        promptResponseId: currentPrompt.promptResponses[0].id,
        url: publicUrl.publicUrl,
      });

      // Refresh data
      await refreshPromptCategory();
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  //
  // ----- Summary Save -----
  //
  const handleSaveSummary = async () => {
    if (!currentPrompt?.promptResponses[0]?.id) return;

    try {
      const { error } = await supabase
        .from('PromptResponse')
        .update({ summary })
        .eq('id', currentPrompt.promptResponses[0].id);

      if (error) throw error;

      // Refresh data
      await refreshPromptCategory();
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  };

  const handleStartUpload = () => {
    setIsUploading(true);
  };

  //
  // ------ Rendering ------
  //

  // If any error from above
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
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

  // If still loading
  if (!promptCategory) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
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

  // If the current prompt doesn't exist
  if (!currentPrompt) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>No Prompt Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No prompt found at this index.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // We already have hasResponse & currentResponse
  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Topics
          </Button>
          <h1 className="text-3xl font-bold">{promptCategory.category}</h1>
          <p className="text-gray-600 mt-2">{promptCategory.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={handlePrevious} disabled={currentPromptIndex === 0} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Badge variant="outline" className="px-4 py-2">
            {currentPromptIndex + 1} of {promptCategory.prompts.length}
          </Badge>
          <Button
            onClick={handleNext}
            disabled={currentPromptIndex === promptCategory.prompts.length - 1}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Current Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>{currentPrompt.promptText}</CardTitle>
          <CardDescription>
            {currentPrompt.isContextEstablishing
              ? 'Context Establishing Question'
              : 'Follow-up Question'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recording/Upload Interface */}
          {isRecording ? (
            <RecordingInterface
              onComplete={handleVideoComplete}
              onCancel={() => setIsRecording(false)}
              onClose={() => setIsRecording(false)}
              onSave={handleVideoComplete}
            />
          ) : (
            <div className="flex justify-center gap-4">
              <Button onClick={handleStartRecording} size="lg">
                <Camera className="mr-2 h-5 w-5" />
                Record Video
              </Button>
              <Button onClick={handleStartUpload} size="lg" variant="outline">
                <Upload className="mr-2 h-5 w-5" />
                Upload Video
              </Button>
            </div>
          )}

          {/* Upload Popup */}
          <UploadPopup
            isOpen={isUploading}
            onClose={() => setIsUploading(false)}
            promptText={currentPrompt.promptText}
            onComplete={handleVideoComplete}
            onSave={handleVideoComplete}
          />

          {/* Existing Response */}
          {currentResponse && (
            <div className="space-y-6">
              {/* Video Player (array of length 0 or 1) */}
              {currentResponse?.video && (
                <Card key={currentResponse.video.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Your Video Response</h3>
                    {currentResponse.video.muxPlaybackId && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedVideoId(currentResponse.video?.muxPlaybackId || null);
                          setIsVideoPopupOpen(true);
                        }}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Watch Video
                      </Button>
                    )}
                  </div>
                </Card>
              )}

              {/* Summary */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Response Summary</h3>
                    <Button variant="ghost" size="sm" onClick={handleSaveSummary}>
                      <Edit className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                  <Textarea
                    value={currentResponse?.responseText || ''}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Add a summary of your response..."
                    className="min-h-[100px]"
                  />
                </div>
              </Card>

              {/* Transcription */}
              <Card className="p-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Transcription</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {currentResponse?.transcription || 'Transcription will appear here...'}
                  </div>
                </div>
              </Card>

              {/* Supporting Images */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Supporting Images</h3>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Add Image
                    </Button>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      aria-label="Upload supporting image"
                      title="Upload supporting image"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {currentResponse?.supportingImages?.map((image) => (
                      <div key={image.id} className="aspect-square rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt="Supporting content"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Popup */}
      {selectedVideoId && (
        <VideoPopup
          isOpen={isVideoPopupOpen}
          onClose={() => {
            setIsVideoPopupOpen(false);
            setSelectedVideoId(null);
          }}
          promptText={currentPrompt.promptText}
          videoId={selectedVideoId}
          onNext={() => {
            /* handle next video if you had multiple (optional) */
          }}
          onPrevious={() => {
            /* handle previous video if you had multiple (optional) */
          }}
          hasNext={false}
          hasPrevious={false}
        />
      )}
    </div>
  );
}