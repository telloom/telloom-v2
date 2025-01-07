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

  interface VideoAPI {
    uploads: {
      create(options: VideoUploadOptions): Promise<VideoUpload>;
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