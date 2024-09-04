// utils/muxClient.ts
import Mux from '@mux/mux-node';

// Define the shape of the Mux instance
interface MuxInstance {
  Video: {
    Uploads: {
      create: (options: any) => Promise<{ url: string }>;
    };
    Assets: {
      create: (options: any) => Promise<any>;
      get: (assetId: string) => Promise<any>;
    };
  };
}

const muxTokenId = process.env.MUX_TOKEN_ID;
const muxSecretKey = process.env.MUX_SECRET_KEY;

if (!muxTokenId || !muxSecretKey) {
  console.error('Mux credentials are not properly configured. Please check your environment variables.');
}

const muxClient = new Mux({
  tokenId: muxTokenId,
  tokenSecret: muxSecretKey
}) as unknown as MuxInstance;

export const createUploadUrl = async () => {
  if (!muxTokenId || !muxSecretKey) {
    throw new Error('Mux credentials are not properly configured. Please check your environment variables.');
  }
  const upload = await muxClient.Video.Uploads.create({
    new_asset_settings: { playback_policy: 'public' },
    cors_origin: process.env.NEXT_PUBLIC_APP_URL,
  });
  return upload.url;
};

export const createAsset = async (uploadId: string) => {
  if (!muxTokenId || !muxSecretKey) {
    throw new Error('Mux credentials are not properly configured. Please check your environment variables.');
  }
  const asset = await muxClient.Video.Assets.create({
    input: [{ url: uploadId }],
    playback_policy: 'public',
  });
  return asset;
};

export const getAsset = async (assetId: string) => {
  if (!muxTokenId || !muxSecretKey) {
    throw new Error('Mux credentials are not properly configured. Please check your environment variables.');
  }
  const asset = await muxClient.Video.Assets.get(assetId);
  return asset;
};