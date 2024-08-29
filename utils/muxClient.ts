// utils/muxClient.ts
import Mux from '@mux/mux-node';

const { Video } = new Mux({
  tokenId: process.env.MUX_ACCESS_TOKEN_ID!,
  tokenSecret: process.env.MUX_SECRET_KEY!
});

export const createUploadUrl = async () => {
  const upload = await Video.Uploads.create({
    new_asset_settings: { playback_policy: 'public' },
    cors_origin: process.env.NEXT_PUBLIC_APP_URL,
  });
  return upload.url;
};

export const createAsset = async (uploadId: string) => {
  const asset = await Video.Assets.create({
    input: [{ url: uploadId }],
    playback_policy: 'public',
  });
  return asset;
};

export const getAsset = async (assetId: string) => {
  const asset = await Video.Assets.get(assetId);
  return asset;
};