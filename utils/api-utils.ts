import { headers } from 'next/headers';

export async function getHeaders() {
  const headersList = await headers();
  const authorization = await headersList.get('authorization');
  const origin = await headersList.get('origin');
  const muxSignature = await headersList.get('mux-signature');
  
  return {
    authorization,
    origin,
    muxSignature
  };
} 