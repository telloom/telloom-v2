import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/database.types';

// Helper function to slugify strings for filenames
function slugify(text: string | null | undefined): string {
  if (!text) return 'untitled'; // Handle null, undefined, or empty input
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

// Initialize Mux - Ensure environment variables are set
if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  throw new Error('Mux token ID or secret is not set in environment variables');
}
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function POST(request: Request) {
  console.log('[API /api/mux/download] POST handler started.');
  // Resolve the cookie store promise first
  const resolvedCookieStore = await cookies(); 
  console.log('[API /api/mux/download] Next.js cookie store obtained.');

  // 1. Read all request cookies into an in-memory map
  const requestCookies = new Map<string, string>();
  const allCookies = resolvedCookieStore.getAll(); // Use resolved store
  for (const cookie of allCookies) { 
    requestCookies.set(cookie.name, cookie.value);
  }
  console.log(`[API /api/mux/download] Read ${requestCookies.size} request cookies into memory.`);

  // 2. Map to track cookies to be set in the response
  const responseCookies = new Map<string, { value: string; options: CookieOptions }>();

  let supabase: SupabaseClient<Database>;
  try {
    supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // 3. Handlers interact with the in-memory maps
          get(name: string) {
            // console.log(`[API /api/mux/download] Supabase requesting cookie: ${name}`);
            // Read SYNCHRONOUSLY from the pre-populated map
            return requestCookies.get(name);
          },
          set(name: string, value: string, options: CookieOptions) {
            // console.log(`[API /api/mux/download] Supabase setting cookie: ${name}`);
            requestCookies.set(name, value); // Update request map for subsequent gets
            responseCookies.set(name, { value, options }); // Track for response
          },
          remove(name: string, options: CookieOptions) {
            // console.log(`[API /api/mux/download] Supabase removing cookie: ${name}`);
            requestCookies.delete(name); // Update request map
            responseCookies.set(name, { value: '', options: { ...options, maxAge: 0 } }); // Track for response
          },
        },
      }
    );
    console.log('[API /api/mux/download] Supabase client created with in-memory cookie handlers reading from pre-populated map.');
  } catch (error) {
     console.error('[API /api/mux/download] Error creating Supabase client:', error);
     return NextResponse.json({ error: 'Failed to initialize Supabase client' }, { status: 500 });
  }

  // 4. Unconditional Auth Check (uses the handlers above)
  console.log('[API /api/mux/download] Performing auth check...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
  if (authError || !user) {
    console.error('[API /api/mux/download] Authentication Error:', authError?.message || 'User not found.');
    // Even if auth fails, apply any cookies Supabase might have tried to set (e.g., clearing invalid ones)
     try {
        responseCookies.forEach((cookie, name) => {
          resolvedCookieStore.set(name, cookie.value, cookie.options); // Use resolved store
        });
        console.log('[API /api/mux/download] Applied response cookies before 401 exit.');
     } catch (cookieError) {
        console.error('[API /api/mux/download] Error applying cookies before 401 exit:', cookieError);
     }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log(`[API /api/mux/download] Auth check successful for user: ${user.id.substring(0,8)}`);

  // --- Main Download Logic --- 
  let finalResponse: NextResponse;
  try {
    const body = await request.json();
    const { muxAssetId, quality = 'original', videoType, checkAvailabilityOnly = false, userId: profileSharerId, topicName } = body;
    console.log('[API /api/mux/download] Request body:', body);
    
    if (!muxAssetId) {
      finalResponse = NextResponse.json({ error: 'Mux Asset ID is required' }, { status: 400 });
      throw new Error('Mux Asset ID missing'); // Throw to ensure cookie application in finally block
    }

    console.log('[API /api/mux/download] Fetching asset details from Mux...');
    const asset = await mux.video.assets.retrieve(muxAssetId);

    // --- ADD DETAILED LOGGING --- 
    console.log('[API /api/mux/download] Full Mux asset static_renditions details:', JSON.stringify(asset.static_renditions, null, 2));
    // --- END DETAILED LOGGING ---

    // Handle availability check response
    if (checkAvailabilityOnly) {
      const isAvailable = asset.static_renditions?.files?.some(
        (file: any) => file.status === 'ready' 
      ) ?? false;

      console.log(`[API /api/mux/download] Availability check result: ${isAvailable}`);
      finalResponse = NextResponse.json({ isAvailable });
      // NOTE: Execution continues to finally block from here if checkAvailabilityOnly is true
    } else {
      // Proceed with Download Logic
      const renditionFiles = asset.static_renditions?.files ?? [];
      console.log('[API /api/mux/download] Available rendition files:', renditionFiles.map(f => f.name));

      let selectedFile;
      if (quality === 'original' || quality === 'highest') {
        selectedFile = renditionFiles
          .filter(f => f.ext === 'mp4')
          .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
      } else {
        selectedFile = renditionFiles.find(f => f.name?.includes(quality) && f.ext === 'mp4');
      }

      if (!selectedFile) {
        console.error('[API /api/mux/download] Could not find a suitable MP4 rendition for quality:', quality);
        finalResponse = NextResponse.json({ error: 'Could not find a suitable MP4 rendition' }, { status: 404 });
        throw new Error('Suitable rendition not found');
      }
      console.log('[API /api/mux/download] Selected rendition file:', selectedFile.name);

      const playbackId = asset.playback_ids?.find(p => p.policy === 'public')?.id;
      if (!playbackId) {
          finalResponse = NextResponse.json({ error: 'No public playback ID found for asset' }, { status: 404 });
          throw new Error('Public playback ID not found');
      }
      const downloadUrl = `https://stream.mux.com/${playbackId}/${selectedFile.name}?download=1`;
      console.log('[API /api/mux/download] Final download URL:', downloadUrl);

      // --- Generate Filename ---
      const shortUuid = uuidv4().substring(0, 4);
      let firstName: string | null = 'user';
      let lastName: string | null = 'name';
      let actualTopicName = topicName || 'untitled';

      // Create Service Role Client to get Profile info safely
      if (profileSharerId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const serviceSupabase = createServerClient<Database>(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
              {
                cookies: { // Service client doesn't need complex cookie handling
                  get: () => undefined,
                  set: () => {},
                  remove: () => {},
                },
              }
          );
          console.log('[API /api/mux/download] Service client created for profile fetch.');

          console.log(`[API /api/mux/download] Fetching profileId for sharerId: ${profileSharerId}`);
          const { data: sharerData, error: sharerError } = await serviceSupabase
            .from('ProfileSharer')
            .select('profileId')
            .eq('id', profileSharerId)
            .single();
          
          if (sharerError || !sharerData?.profileId) {
            console.error('[API /api/mux/download] Error fetching profileId from ProfileSharer:', sharerError?.message || 'No profileId found');
          } else {
            const targetProfileId = sharerData.profileId;
            console.log(`[API /api/mux/download] Found profileId: ${targetProfileId}. Fetching profile details...`);
            const { data: profileData, error: profileError } = await serviceSupabase
              .from('Profile')
              .select('firstName, lastName')
              .eq('id', targetProfileId)
              .single();
            
            if (profileError) {
              console.error(`[API /api/mux/download] Error fetching profile details for profileId ${targetProfileId}:`, profileError);
            } else if (profileData) {
              firstName = profileData.firstName ?? firstName;
              lastName = profileData.lastName ?? lastName;
              console.log(`[API /api/mux/download] Profile details fetched: ${firstName} ${lastName}`);
            }
          }
        } catch (error) {
          console.error('[API /api/mux/download] Error during profile fetch:', error);
        }
      } else {
        console.warn('[API /api/mux/download] Skipping profile fetch for filename: Missing profileSharerId or service key.');
      }

      const finalFilename = `${slugify(lastName)}-${slugify(firstName)}_${slugify(actualTopicName)}_${videoType === 'topic' ? 'Topic' : 'Prompt'}_${shortUuid}.mp4`;
      console.log('[API /api/mux/download] Generated filename:', finalFilename);

      // --- Log Download Event (Placeholder) ---
      /*
      if (profileSharerId && user) {
        try {
          const { error: logError } = await supabase 
            .from('VideoDownload') 
            .insert({
              profileId: user.id,
              muxAssetId: muxAssetId,
              downloadedAt: new Date().toISOString(),
              qualityRequested: quality,
            });
          if (logError) throw logError;
          console.log('[API /api/mux/download] Video download event logged successfully.');
        } catch (error) {
          console.error('[API /api/mux/download] Error logging video download:', error);
        }
      } else {
         console.warn('[API /api/mux/download] Cannot log download event: profileSharerId or user object is missing.');
      }
      */

      console.log('[API /api/mux/download] Fetching video blob from Mux...');
      const muxResponse = await fetch(downloadUrl);
      if (!muxResponse.ok) {
        console.error(`[API /api/mux/download] Failed to fetch video from Mux. Status: ${muxResponse.status}`);
        finalResponse = NextResponse.json({ error: 'Failed to fetch video from Mux' }, { status: muxResponse.status });
         throw new Error('Mux fetch failed');
      }
      const videoBlob = await muxResponse.blob();
      console.log('[API /api/mux/download] Video blob fetched successfully.');

      const headers = new Headers();
      headers.set('Content-Type', 'video/mp4');
      headers.set('Content-Disposition', `attachment; filename="${finalFilename}"`);

      console.log('[API /api/mux/download] Preparing video blob response.');
      finalResponse = new NextResponse(videoBlob, { headers });
    }

  } catch (error) {
    console.error('[API /api/mux/download] Error during main download logic:', error instanceof Error ? error.message : error);
    // Ensure finalResponse is set for error cases handled by throws
    if (!finalResponse) {
       finalResponse = NextResponse.json({ error: 'An unexpected error occurred during processing' }, { status: 500 });
    }
  } finally {
    // 5. Apply response cookies before sending the response
    try {
        responseCookies.forEach((cookie, name) => {
          console.log(`[API /api/mux/download] Applying response cookie: ${name}`);
          resolvedCookieStore.set(name, cookie.value, cookie.options); // Use resolved store
        });
    } catch (cookieError) {
        console.error('[API /api/mux/download] Error applying response cookies in finally block:', cookieError);
        // Potentially modify finalResponse if cookie setting fails critically
        if (!finalResponse) { // Ensure a response is always created
             finalResponse = NextResponse.json({ error: 'An error occurred applying session updates.' }, { status: 500 });
        }
    }
  }

  console.log(`[API /api/mux/download] Sending final response with status: ${finalResponse.status}`);
  return finalResponse; 
}

export function GET() {
  // Optional: Handle GET requests if needed, e.g., return status or info
  return NextResponse.json({ message: 'Mux download API endpoint. Use POST to initiate download.' });
}
