// supabase.ts
/**
 * Contains TypeScript types generated for your Supabase database schema.
 * Useful if you're interacting directly with Supabase features like real-time
 * subscriptions or database functions.
 * 
 * As your database schema changes, regenerate or update these types to keep them accurate.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Include definitions for your tables here
      // For example:
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          // ... other fields
        };
        Insert: {
          id: string;
          username?: string | null;
          // ... other fields
        };
        Update: {
          id?: string;
          username?: string | null;
          // ... other fields
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      // ... other tables
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}