// utils/muxClient.ts
import axios from 'axios';

const MUX_TOKEN_ID = process.env.MUX_ACCESS_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_SECRET_KEY;

if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
  console.error('Mux credentials are not set properly');
}

const muxClient = axios.create({
  baseURL: 'https://api.mux.com',
  auth: {
    username: MUX_TOKEN_ID!,
    password: MUX_TOKEN_SECRET!,
  },
});

export const createUploadUrl = async () => {
  try {
    console.log('Creating Mux upload URL...');
    console.log('MUX_TOKEN_ID:', MUX_TOKEN_ID);
    console.log('MUX_TOKEN_SECRET:', MUX_TOKEN_SECRET ? '[REDACTED]' : 'undefined');
    const response = await muxClient.post('/video/v1/uploads', {
      cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      new_asset_settings: {
        playback_policy: ['public'],
      },
    });
    console.log('Mux upload URL created:', response.data.data.url);
    return response.data.data.url;
  } catch (error) {
    console.error('Error creating Mux upload URL:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

export const getUploadStatus = async (uploadId: string) => {
  try {
    const response = await muxClient.get(`/video/v1/uploads/${uploadId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error getting upload status:', error);
    throw error;
  }
};

export const getAsset = async (assetId: string) => {
  try {
    const response = await muxClient.get(`/video/v1/assets/${assetId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error getting asset:', error);
    throw error;
  }
};

export const createAsset = async (uploadId: string) => {
  try {
    const response = await muxClient.post('/video/v1/assets', {
      input: [{ url: `https://storage.muxcdn.com/${uploadId}` }],
      playback_policy: ['public'],
    });
    return response.data.data;
  } catch (error) {
    console.error('Error creating asset:', error);
    throw error;
  }
};