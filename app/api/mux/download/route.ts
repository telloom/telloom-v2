import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import axios from 'axios';
import { createClient, getUser } from '@/utils/supabase/server';

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  throw new Error('Missing required Mux environment variables');
}

// Define a more complete Asset type that includes all the properties we need
interface MuxAsset {
  id: string;
  status: string;
  mp4_support: string;
  master_access: string;
  playback_ids?: Array<{ id: string; policy: string }>;
  static_renditions?: { status: string; files?: Array<any> };
}

// Initialize Mux API client
const muxClient = axios.create({
  baseURL: 'https://api.mux.com',
  auth: {
    username: process.env.MUX_TOKEN_ID,
    password: process.env.MUX_TOKEN_SECRET,
  },
});

// Quality options and their corresponding resolutions
const QUALITY_OPTIONS = {
  'audio': { type: 'audio-only', maxHeight: 0 },
  '480p': { type: 'standard', maxHeight: 480 },
  '720p': { type: 'standard', maxHeight: 720 },
  '1080p': { type: 'capped-1080p', maxHeight: 1080 },
  'original': { type: 'master', maxHeight: Infinity }
} as const;

type QualityOption = keyof typeof QUALITY_OPTIONS;

export async function POST(request: Request) {
  try {
    // Get the user
    console.log('Starting authentication check...');
    const user = await getUser();
    if (!user?.id) {
      console.log('Authentication failed: No user ID found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.log('Authentication successful for user:', user.id);

    // Get request body
    const body = await request.json();
    console.log('Request body:', body);
    const { muxAssetId, quality = '720p', videoType, checkAvailabilityOnly = false } = body;
    
    if (!muxAssetId) {
      console.log('Missing muxAssetId in request');
      return NextResponse.json(
        { error: 'Missing muxAssetId' },
        { status: 400 }
      );
    }

    // First, get the asset details
    console.log('Fetching asset details from Mux...');
    const assetResponse = await muxClient.get(`/video/v1/assets/${muxAssetId}`);
    const asset = assetResponse.data.data as MuxAsset;
    
    console.log('Initial asset state:', {
      mp4_support: asset.mp4_support,
      status: asset.status,
      master_access: asset.master_access,
      playback_ids: asset.playback_ids,
      raw_response: assetResponse.data
    });

    // If this is just an availability check, return a simple response
    if (checkAvailabilityOnly) {
      const isAvailable = asset.status === 'ready' && 
                         asset.mp4_support !== 'none' && 
                         asset.static_renditions?.status === 'ready';
      
      return NextResponse.json({ isAvailable });
    }

    // Check if asset is ready
    if (asset.status !== 'ready') {
      console.log('Asset not ready, current status:', asset.status);
      return NextResponse.json(
        { error: 'Asset is not ready for download' },
        { status: 400 }
      );
    }

    // Enable MP4 support if not already enabled
    if (!asset.mp4_support || asset.mp4_support === 'none') {
      console.log('MP4 support not enabled, attempting to enable...');
      try {
        console.log('Making MP4 support request to Mux...');
        const mp4Request = {
          mp4_support: 'standard'
        };
        console.log('MP4 support request payload:', mp4Request);
        
        const mp4Response = await muxClient.put(`/video/v1/assets/${muxAssetId}/mp4-support`, mp4Request);
        console.log('MP4 support request successful:', mp4Response.data);
      } catch (error: any) {
        console.error('Error enabling MP4 support:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          requestPayload: error.config?.data,
          url: error.config?.url,
          method: error.config?.method
        });

        // Try alternative approach with capped-1080p
        try {
          console.log('Attempting alternative MP4 support with capped-1080p...');
          const alternativeRequest = {
            mp4_support: 'capped-1080p'
          };
          console.log('Alternative request payload:', alternativeRequest);
          
          const alternativeResponse = await muxClient.put(`/video/v1/assets/${muxAssetId}/mp4-support`, alternativeRequest);
          console.log('Alternative MP4 support request successful:', alternativeResponse.data);
        } catch (retryError: any) {
          console.error('Error with alternative MP4 support approach:', {
            error: retryError.message,
            response: retryError.response?.data,
            status: retryError.response?.status,
            requestPayload: retryError.config?.data
          });
          throw new Error(`Failed to enable MP4 support: ${error.message}`);
        }
      }
      
      console.log('Waiting for MP4 support changes to take effect...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Enable master access if needed for original quality
    if (quality === 'original' && (!asset.master_access || asset.master_access !== 'temporary')) {
      console.log('Enabling master access for original quality...');
      try {
        const masterRequest = {
          master_access: 'temporary'
        };
        console.log('Master access request payload:', masterRequest);
        
        const masterResponse = await muxClient.put(`/video/v1/assets/${muxAssetId}/master-access`, masterRequest);
        console.log('Master access request successful:', masterResponse.data);
      } catch (error: any) {
        console.error('Error enabling master access:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          requestPayload: error.config?.data,
          url: error.config?.url,
          method: error.config?.method
        });
        throw new Error('Failed to enable master access');
      }
      
      console.log('Waiting for master access changes to take effect...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Get updated asset after changes
    console.log('Fetching updated asset details...');
    const updatedAssetResponse = await muxClient.get(`/video/v1/assets/${muxAssetId}`);
    const updatedAsset = updatedAssetResponse.data.data as MuxAsset;
    
    console.log('Updated asset state:', {
      mp4_support: updatedAsset.mp4_support,
      status: updatedAsset.status,
      master_access: updatedAsset.master_access,
      playback_ids: updatedAsset.playback_ids,
      static_renditions: updatedAsset.static_renditions,
      raw_response: updatedAssetResponse.data
    });

    const playbackId = updatedAsset.playback_ids?.[0]?.id;
    if (!playbackId) {
      console.error('No playback ID available in asset:', updatedAsset);
      throw new Error('No playback ID available');
    }

    // Check if static renditions are ready
    if (!updatedAsset.static_renditions?.status || updatedAsset.static_renditions.status !== 'ready') {
      console.log('Static renditions not ready:', updatedAsset.static_renditions);
      return NextResponse.json(
        { error: 'Video is still being processed. Please try again in a few moments.' },
        { status: 400 }
      );
    }

    console.log('Available static renditions:', updatedAsset.static_renditions);

    // For original quality, use the highest quality available rendition
    let downloadUrl;
    if (quality === 'original') {
      // Find the highest quality rendition available
      const files = updatedAsset.static_renditions.files || [];
      console.log('Available rendition files:', files);
      
      // Default to 1080p if available, otherwise use the highest available quality
      const renditionFile = files.find(f => f.name === '1080p.mp4') || files[0];
      
      if (!renditionFile) {
        console.error('No rendition files available');
        return NextResponse.json(
          { error: 'No video renditions available for download' },
          { status: 400 }
        );
      }
      
      console.log('Selected rendition file:', renditionFile);
      downloadUrl = `https://stream.mux.com/${playbackId}/${renditionFile.name}?download=1`;
    } else {
      // For specific quality requests
      downloadUrl = `https://stream.mux.com/${playbackId}/${quality}.mp4?download=1`;
    }

    console.log('Final download URL:', downloadUrl);
    
    try {
      // Attempt to fetch the video
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        console.error('Failed to fetch video:', {
          status: response.status,
          statusText: response.statusText,
          url: downloadUrl
        });
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      // Return the video stream with proper headers
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="video-${quality}.mp4"`,
        },
      });
    } catch (error: any) {
      console.error('Error streaming video:', {
        error: error.message,
        url: downloadUrl,
        quality,
        muxAssetId
      });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to stream video' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error handling download:', {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 