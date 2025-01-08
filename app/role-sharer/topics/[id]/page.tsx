'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingInterface } from '@/components/RecordingInterface';
import { VideoPopup } from '@/components/VideoPopup';
import { UploadPopup } from '@/components/UploadPopup';
import { ArrowLeft, Video as VideoIcon, Play, CheckCircle2, LayoutGrid, Table as TableIcon, Upload, Paperclip } from 'lucide-react';
import { PromptCategory, Prompt, PromptResponse, PromptResponseAttachment } from '@/types/models';
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
import dynamic from 'next/dynamic';
import { PromptResponseGallery } from '@/components/PromptResponseGallery';
import { ErrorBoundary } from 'react-error-boundary';
import { cn } from "@/lib/utils";

// Dynamically import AttachmentUpload with no SSR
const AttachmentUpload = dynamic(
  () => import('@/components/AttachmentUpload').then(mod => ({ default: mod.AttachmentUpload })),
  { ssr: false }
);
interface TopicPageContentProps {
  promptCategory: PromptCategory | null;
  viewMode: 'table' | 'grid';
  sortByStatus: boolean;
  isVideoPopupOpen: boolean;
  isRecordingPopupOpen: boolean;
  isUploadPopupOpen: boolean;
  isAttachmentUploadOpen: boolean;
  selectedPrompt: Prompt | null;
  selectedPromptResponse: PromptResponse | null;
  setViewMode: (mode: 'table' | 'grid') => void;
  setSortByStatus: (status: boolean) => void;
  setSelectedPrompt: (prompt: Prompt | null) => void;
  setSelectedPromptResponse: (response: PromptResponse | null) => void;
  setIsVideoPopupOpen: (open: boolean) => void;
  setIsRecordingPopupOpen: (open: boolean) => void;
  setIsUploadPopupOpen: (open: boolean) => void;
  setIsAttachmentUploadOpen: (open: boolean) => void;
  handleVideoComplete: () => Promise<string>;
  refreshData: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
}

// Add error logging utility
const logError = (error: any, context: string) => {
  console.error(`[${context}] Error:`, {
    message: error?.message,
    stack: error?.stack,
    cause: error?.cause,
    name: error?.name,
    ...(error?.response && {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data
    })
  });
  
  // Log to server if needed
  if (process.env.NODE_ENV === 'production') {
    // Add server logging here
  }
};

// Error boundary component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error | string; resetErrorBoundary: () => void }) => {
  const errorMessage = error instanceof Error ? error.message : error;
  return (
    <div className="container mx-auto py-8">
      <Card className="p-6 border-2 border-red-500 shadow-[6px_6px_0_0_#ef4444]">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{errorMessage}</p>
          <Button className="mt-4" onClick={resetErrorBoundary}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Main content component to wrap in error boundary
const TopicPageContent = ({ 
  promptCategory,
  viewMode,
  sortByStatus,
  isVideoPopupOpen,
  isRecordingPopupOpen,
  isUploadPopupOpen,
  isAttachmentUploadOpen,
  selectedPrompt,
  selectedPromptResponse,
  setViewMode,
  setSortByStatus,
  setSelectedPrompt,
  setSelectedPromptResponse,
  setIsVideoPopupOpen,
  setIsRecordingPopupOpen,
  setIsUploadPopupOpen,
  setIsAttachmentUploadOpen,
  handleVideoComplete,
  refreshData,
  router
}: TopicPageContentProps) => {
  // Add error boundary for renderGallery
  const renderGallery = useCallback((promptResponse: PromptResponse | null) => {
    try {
      if (!promptResponse?.id || !Array.isArray(promptResponse?.attachments) || promptResponse.attachments.length === 0) {
        return null;
      }
      
    return (
        <div className="flex justify-end">
          <PromptResponseGallery promptResponseId={promptResponse.id} />
      </div>
    );
    } catch (error) {
      logError(error, 'renderGallery');
      return null;
    }
  }, []);

  // Add error boundary for initial render checks
  try {
    if (!promptCategory) return null;

    const completedCount = promptCategory?.prompts?.filter((p: Prompt) => p.promptResponses?.length > 0)?.length || 0;
    const totalCount = promptCategory?.prompts?.length || 0;
    const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const sortedPrompts = sortByStatus && promptCategory?.prompts 
      ? [...promptCategory.prompts].sort((a: Prompt, b: Prompt) => {
          const aHasResponse = a?.promptResponses?.[0]?.videos?.[0]?.muxPlaybackId ? 1 : 0;
          const bHasResponse = b?.promptResponses?.[0]?.videos?.[0]?.muxPlaybackId ? 1 : 0;
          return bHasResponse - aHasResponse;
        })
      : promptCategory?.prompts || [];

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
              <h1 className="text-3xl font-bold">{promptCategory?.category || 'Topic'}</h1>
              <p className="text-gray-600 mt-2">{promptCategory?.description}</p>
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
              if (!prompt?.id) return null;
              
              const hasResponse = prompt?.promptResponses?.[0]?.videos?.[0]?.muxPlaybackId;
              const promptResponse = hasResponse ? prompt.promptResponses[0] : null;
            
            return (
              <Card 
                key={prompt.id}
                className={cn(
                  "border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 flex flex-col",
                  hasResponse && "cursor-pointer"
                )}
                onClick={(e) => {
                  if (
                    e.target instanceof HTMLElement && 
                    !e.target.closest('button') && 
                    hasResponse
                  ) {
                    window.location.href = `/role-sharer/prompts/${prompt.id}`;
                  }
                }}
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
                      {renderGallery(promptResponse)}
                    
                    {/* Buttons */}
                      {hasResponse ? (
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
                              setSelectedPromptResponse(promptResponse);
                            setIsAttachmentUploadOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1"
                        >
                          <Paperclip className="mr-1 h-4 w-4" />
                            {promptResponse?.attachments?.length || 0}
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
                  if (!prompt?.id) return null;
                  
                  const hasResponse = prompt?.promptResponses?.[0]?.videos?.[0]?.muxPlaybackId;
                  const promptResponse = hasResponse ? prompt.promptResponses[0] : null;
                
                return (
                  <TableRow 
                    key={prompt.id} 
                    className={cn(
                      "hover:bg-gray-50/50 border-b border-[#1B4332] last:border-0",
                      hasResponse && "cursor-pointer"
                    )}
                    onClick={(e) => {
                      if (
                        e.target instanceof HTMLElement && 
                        !e.target.closest('button') && 
                        hasResponse
                      ) {
                        window.location.href = `/role-sharer/prompts/${prompt.id}`;
                      }
                    }}
                  >
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
                          {hasResponse ? (
                          <>
                              {renderGallery(promptResponse)}
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
                                  setSelectedPromptResponse(promptResponse);
                                setIsAttachmentUploadOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
                            >
                              <Paperclip className="mr-1 h-4 w-4" />
                                {promptResponse?.attachments?.length || 0}
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
          onComplete={() => {
            setIsUploadPopupOpen(false);
            setSelectedPrompt(null);
          }}
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
  } catch (error) {
    logError(error, 'TopicPageContent-Init');
    return null;
  }
};

// Add error type
interface RefreshError extends Error {
  code?: string;
  details?: string;
}

export default function TopicPage() {
  // Move hooks outside of try-catch to maintain hook order
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const promptId = searchParams.get('prompt');
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
  const [selectedPromptResponse, setSelectedPromptResponse] = useState<PromptResponse | null>(null);

  const refreshData = useCallback(async () => {
    if (!topicId) {
      console.error('[refreshData] No topicId provided');
      return;
    }
    
    try {
      console.log('[refreshData] Starting refresh for topic:', topicId);
      const supabase = createClient();
      
      // Get session with error handling
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[refreshData] Session error:', sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!session) {
        console.log('[refreshData] No session found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('[refreshData] Session found:', session.user.id);

      // Get ProfileSharer record with error handling
      const { data: profileSharer, error: sharerError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', session.user.id)
        .single();

      if (sharerError) {
        console.error('[refreshData] ProfileSharer error:', sharerError);
        throw new Error(`Could not find your sharer profile: ${sharerError.message}`);
      }

      if (!profileSharer) {
        console.error('[refreshData] No ProfileSharer found for user:', session.user.id);
        throw new Error('Could not find your sharer profile');
      }

      console.log('[refreshData] ProfileSharer found:', profileSharer.id);

      // Fetch PromptCategory with error handling
      const { data: categoryData, error: promptError } = await supabase
        .from('PromptCategory')
        .select(`
          id,
          category,
          description,
          theme,
          Prompt!inner (
            id,
            promptText,
            promptType,
            isContextEstablishing,
            promptCategoryId,
            PromptResponse!left (
              id,
              profileSharerId,
              responseText,
              Video!left (
                id,
                muxPlaybackId,
                muxAssetId,
                VideoTranscript!left (
                  transcript
                )
              ),
              PromptResponseAttachment!left (
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
        .throwOnError()
        .single();

      if (promptError) {
        console.error('[refreshData] PromptCategory error:', promptError);
        throw new Error(`Error fetching topic: ${promptError.message}`);
      }

      if (!categoryData) {
        console.error('[refreshData] No PromptCategory found for id:', topicId);
        throw new Error('Topic not found');
      }

      console.log('[refreshData] Successfully fetched data:', {
        id: categoryData.id,
        category: categoryData.category,
        promptCount: categoryData.Prompt?.length
      });

      // Transform the data with error handling
      try {
        const transformedData: PromptCategory = {
          id: categoryData.id,
          category: categoryData.category || '',
          description: categoryData.description || '',
          theme: categoryData.theme || '',
          prompts: (categoryData.Prompt || []).map((prompt: any): Prompt => {
            console.log('[refreshData] Transforming prompt:', prompt.id);
            
            const promptResponses = (prompt.PromptResponse || [])
              .filter((response: any) => {
                const matches = response.profileSharerId === profileSharer.id;
                if (!matches) {
                  console.log('[refreshData] Filtering out response:', response.id, 'profileSharerId:', response.profileSharerId);
                }
                return matches;
              })
              .map((response: any): PromptResponse => {
                console.log('[refreshData] Transforming response:', response.id);
                
                const attachments = (response.PromptResponseAttachment || [])
                  .map((attachment: any): PromptResponseAttachment | undefined => {
                    if (!attachment?.id) {
                      console.warn('[refreshData] Invalid attachment:', attachment);
                      return undefined;
                    }
                    
                    return {
                      id: attachment.id,
                      promptResponseId: response.id,
                      fileUrl: attachment.fileUrl || '',
                      fileType: attachment.fileType || '',
                      fileName: attachment.fileName || '',
                      promptResponse: {
                        id: response.id,
                        summary: response.responseText || '',
                        transcription: '',
                        videos: [],
                        attachments: []
                      }
                    };
                  })
                  .filter((a: PromptResponseAttachment | undefined): a is PromptResponseAttachment => a !== undefined);

                return {
                  id: response.id,
                  summary: response.responseText || '',
                  transcription: response.Video?.VideoTranscript?.transcript || '',
                  videos: response.Video ? [{
                    id: response.Video.id,
                    muxPlaybackId: response.Video.muxPlaybackId
                  }] : [],
                  attachments
                };
              });

            return {
              id: prompt.id,
              promptText: prompt.promptText || '',
              promptType: prompt.promptType || '',
              isContextEstablishing: prompt.isContextEstablishing || false,
              promptCategoryId: prompt.promptCategoryId || '',
              videos: [],
              promptResponses
            };
          })
        };

        console.log('[refreshData] Successfully transformed data');

        // After setting promptCategory, find and set the current prompt index if promptId exists
        if (promptId && transformedData) {
          const promptIndex = transformedData.prompts.findIndex(p => p.id === promptId);
          if (promptIndex !== -1) {
            setCurrentPromptIndex(promptIndex);
          }
        }

        setPromptCategory(transformedData);
      } catch (error) {
        const e = error as RefreshError;
        console.error('[refreshData] Error transforming data:', e);
        throw new Error(`Error transforming data: ${e.message}`);
      }
    } catch (error) {
      const e = error as RefreshError;
      console.error('[refreshData] Fatal error:', e);
      throw e;
    }
  }, [topicId, router]);

  const fetchData = useCallback(async () => {
    if (!topicId) {
      console.error('[fetchData] No topicId provided');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[fetchData] Starting initial fetch for topic:', topicId);
      await refreshData();
    } catch (error) {
      const e = error as RefreshError;
      console.error('[fetchData] Error:', e);
      setError(e.message || 'An unexpected error occurred');
      
      // If it's a 404, redirect to topics page
      if (e.code === 'PGRST116') {
        console.log('[fetchData] Topic not found, redirecting');
        router.push('/role-sharer/topics');
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }, [topicId, refreshData, router]);

  useEffect(() => {
    try {
      if (params && typeof params.id === 'string') {
        console.log('[useEffect-params] Setting topicId:', params.id);
        setTopicId(params.id);
      } else {
        console.log('[useEffect-params] Invalid params, redirecting');
        router.push('/role-sharer/topics');
      }
    } catch (error) {
      const e = error as RefreshError;
      console.error('[useEffect-params] Error:', e);
      router.push('/role-sharer/topics');
    }
  }, [params, router]);

  useEffect(() => {
    if (!topicId) {
      console.log('[useEffect-fetchData] No topicId yet, skipping fetch');
      return;
    }

    try {
      console.log('[useEffect-fetchData] Calling fetchData');
      fetchData();
    } catch (error) {
      const e = error as RefreshError;
      console.error('[useEffect-fetchData] Error:', e);
    }
  }, [topicId, fetchData]);

  const handleVideoComplete = useCallback(async () => {
    try {
      await refreshData();
      setIsRecordingPopupOpen(false);
      setIsUploadPopupOpen(false);
      setSelectedPrompt(null);
      return '';
    } catch (error) {
      const e = error as RefreshError;
      console.error('[handleVideoComplete] Error:', e);
      toast.error('Failed to refresh video data');
      return '';
    }
  }, [refreshData]);

  // Wrap the render in try-catch
  try {
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
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={() => {
            setError(null);
            setIsLoading(true);
            fetchData();
          }} 
        />
      );
    }

    return (
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
          setError(null);
          setIsLoading(true);
          fetchData();
        }}
        onError={(error) => logError(error, 'ErrorBoundary')}
      >
        <TopicPageContent
          promptCategory={promptCategory}
          viewMode={viewMode}
          sortByStatus={sortByStatus}
          isVideoPopupOpen={isVideoPopupOpen}
          isRecordingPopupOpen={isRecordingPopupOpen}
          isUploadPopupOpen={isUploadPopupOpen}
          isAttachmentUploadOpen={isAttachmentUploadOpen}
          selectedPrompt={selectedPrompt}
          selectedPromptResponse={selectedPromptResponse}
          setViewMode={setViewMode}
          setSortByStatus={setSortByStatus}
          setSelectedPrompt={setSelectedPrompt}
          setSelectedPromptResponse={setSelectedPromptResponse}
          setIsVideoPopupOpen={setIsVideoPopupOpen}
          setIsRecordingPopupOpen={setIsRecordingPopupOpen}
          setIsUploadPopupOpen={setIsUploadPopupOpen}
          setIsAttachmentUploadOpen={setIsAttachmentUploadOpen}
          handleVideoComplete={handleVideoComplete}
          refreshData={refreshData}
          router={router}
        />
      </ErrorBoundary>
    );
  } catch (error) {
    logError(error, 'TopicPage-Render');
    return (
      <ErrorFallback 
        error={error instanceof Error ? error : new Error('An unexpected error occurred')} 
        resetErrorBoundary={() => window.location.reload()} 
      />
    );
  }
}
