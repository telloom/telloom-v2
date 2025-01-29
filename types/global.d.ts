// global.d.ts
/**
 * Contains global TypeScript declarations for modules without type definitions
 * and environment variables. Helps TypeScript recognize custom modules and
 * environmental constants used throughout the app.
 * 
 * As you add new modules that lack type definitions or introduce new environment
 * variables, declare them here.
 */

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module 'phoenix' {
  const content: any;
  export default content;
}

declare module '@mux/mux-node' {
  interface MuxOptions {
    tokenId: string;
    tokenSecret: string;
  }

  interface VideoUploadOptions {
    cors_origin: string;
    new_asset_settings: {
      playback_policy: string[];
      passthrough?: string;
    };
  }

  interface VideoUpload {
    id: string;
    url: string;
  }

  interface Asset {
    id: string;
    playback_ids?: Array<{
      id: string;
      policy: string;
    }>;
    master?: {
      status: string;
      url?: string;
    };
    mp4_support?: 'none' | 'standard' | 'capped-1080p' | 'audio-only';
    static_renditions?: {
      status: 'preparing' | 'ready' | 'failed';
      files?: Array<{
        name: string;
        ext: string;
        height?: number;
        width?: number;
        bitrate?: number;
        filesize?: number;
      }>;
    };
  }

  interface VideoAPI {
    uploads: {
      create(options: VideoUploadOptions): Promise<VideoUpload>;
    };
    assets: {
      retrieve(assetId: string): Promise<Asset>;
      delete(assetId: string): Promise<void>;
      masterAccess: {
        update(assetId: string, params: { master_access: 'temporary' | 'none' }): Promise<Asset>;
      };
      mp4Support: {
        update(assetId: string, params: { mp4_support: 'none' | 'standard' | 'capped-1080p' | 'audio-only' }): Promise<Asset>;
      };
    };
  }

  export default class Mux {
    constructor(options: MuxOptions);
    video: VideoAPI;

    static Webhooks: {
      verifyHeader(
        body: string,
        signature: string,
        secret: string
      ): any;
    };
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    DATABASE_URL: string;
    DIRECT_URL: string;
    // Add other environment variables as needed
  }
}