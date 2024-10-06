// types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      entitlements: {
        Row: {
          id: number
          revenuecat_id: string
          lookup_key: string
          display_name: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          revenuecat_id: string
          lookup_key: string
          display_name: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          revenuecat_id?: string
          lookup_key?: string
          display_name?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      object_categories: {
        Row: {
          id: number
          category_name: string
          description: string | null
          airtable_record_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          category_name: string
          description?: string | null
          airtable_record_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          category_name?: string
          description?: string | null
          airtable_record_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      object_category_links: {
        Row: {
          id: number
          object_id: number | null
          category_id: number | null
          airtable_record_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          object_id?: number | null
          category_id?: number | null
          airtable_record_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          object_id?: number | null
          category_id?: number | null
          airtable_record_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_category_links_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "object_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_category_links_object_id_fkey"
            columns: ["object_id"]
            referencedRelation: "objects"
            referencedColumns: ["id"]
          }
        ]
      }
      object_prompt_responses: {
        Row: {
          id: number
          object_id: number | null
          prompt_id: number | null
          response_text: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          object_id?: number | null
          prompt_id?: number | null
          response_text?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          object_id?: number | null
          prompt_id?: number | null
          response_text?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_prompt_responses_object_id_fkey"
            columns: ["object_id"]
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_prompt_responses_prompt_id_fkey"
            columns: ["prompt_id"]
            referencedRelation: "prompts_primary"
            referencedColumns: ["id"]
          }
        ]
      }
      objects: {
        Row: {
          id: number
          user_id: string | null
          object_name: string
          object_description: string | null
          airtable_record_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          user_id?: string | null
          object_name: string
          object_description?: string | null
          airtable_record_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string | null
          object_name?: string
          object_description?: string | null
          airtable_record_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      offerings: {
        Row: {
          id: number
          revenuecat_id: string
          lookup_key: string
          display_name: string
          is_current: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          revenuecat_id: string
          lookup_key: string
          display_name: string
          is_current: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          revenuecat_id?: string
          lookup_key?: string
          display_name?: string
          is_current?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          id: number
          revenuecat_id: string
          offering_id: number | null
          product_id: number | null
          lookup_key: string
          display_name: string
          position: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          revenuecat_id: string
          offering_id?: number | null
          product_id?: number | null
          lookup_key: string
          display_name: string
          position?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          revenuecat_id?: string
          offering_id?: number | null
          product_id?: number | null
          lookup_key?: string
          display_name?: string
          position?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_offering_id_fkey"
            columns: ["offering_id"]
            referencedRelation: "offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: number
          revenuecat_id: string
          store_identifier: string
          type: string
          display_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          revenuecat_id: string
          store_identifier: string
          type: string
          display_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          revenuecat_id?: string
          store_identifier?: string
          type?: string
          display_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          password_hash: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          revenuecat_app_user_id: string | null
          status: string | null
          airtable_record_id: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          password_hash?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          revenuecat_app_user_id?: string | null
          status?: string | null
          airtable_record_id?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          password_hash?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          revenuecat_app_user_id?: string | null
          status?: string | null
          airtable_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      prompt_categories: {
        Row: {
          id: number
          category: string | null
          description: string | null
          airtable_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          category?: string | null
          description?: string | null
          airtable_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          category?: string | null
          description?: string | null
          airtable_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prompt_category_links: {
        Row: {
          id: number
          airtable_id: string | null
          prompt_airtable_id: string | null
          category_airtable_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          airtable_id?: string | null
          prompt_airtable_id?: string | null
          category_airtable_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          airtable_id?: string | null
          prompt_airtable_id?: string | null
          category_airtable_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prompt_responses: {
        Row: {
          id: number
          user_id: string | null
          prompt_id: number | null
          video_id: number | null
          response_text: string | null
          privacy_level: string | null
          airtable_record_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          user_id?: string | null
          prompt_id?: number | null
          video_id?: number | null
          response_text?: string | null
          privacy_level?: string | null
          airtable_record_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string | null
          prompt_id?: number | null
          video_id?: number | null
          response_text?: string | null
          privacy_level?: string | null
          airtable_record_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_responses_prompt_id_fkey"
            columns: ["prompt_id"]
            referencedRelation: "prompts_primary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_responses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_responses_video_id_fkey"
            columns: ["video_id"]
            referencedRelation: "videos"
            referencedColumns: ["id"]
          }
        ]
      }
      prompts_primary: {
        Row: {
          id: number
          prompt: string | null
          prompt_type: string | null
          context_establishing_question: boolean | null
          airtable_id: string | null
          created_at: string | null
          updated_at: string | null
          category_id: number | null
          category_airtable_id: string | null
        }
        Insert: {
          id: number
          prompt?: string | null
          prompt_type?: string | null
          context_establishing_question?: boolean | null
          airtable_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          category_id?: number | null
          category_airtable_id?: string | null
        }
        Update: {
          id?: number
          prompt?: string | null
          prompt_type?: string | null
          context_establishing_question?: boolean | null
          airtable_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          category_id?: number | null
          category_airtable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_primary_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "prompt_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      purchases: {
        Row: {
          id: number
          revenuecat_id: string
          user_id: string | null
          product_id: number | null
          purchased_at: string
          store: string
          revenue_in_usd: number
          status: string
          environment: string
          store_purchase_identifier: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          revenuecat_id: string
          user_id?: string | null
          product_id?: number | null
          purchased_at: string
          store: string
          revenue_in_usd: number
          status: string
          environment: string
          store_purchase_identifier?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          revenuecat_id?: string
          user_id?: string | null
          product_id?: number | null
          purchased_at?: string
          store?: string
          revenue_in_usd?: number
          status?: string
          environment?: string
          store_purchase_identifier?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      response_permissions: {
        Row: {
          id: number
          user_id: string | null
          permission_level: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          user_id?: string | null
          permission_level: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string | null
          permission_level?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "response_permissions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscription_entitlements: {
        Row: {
          subscription_id: number
          entitlement_id: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          subscription_id: number
          entitlement_id: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          subscription_id?: number
          entitlement_id?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_entitlements_entitlement_id_fkey"
            columns: ["entitlement_id"]
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_entitlements_subscription_id_fkey"
            columns: ["subscription_id"]
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          id: number
          revenuecat_id: string
          user_id: string | null
          product_id: number | null
          starts_at: string
          current_period_starts_at: string
          current_period_ends_at: string | null
          gives_access: boolean
          auto_renewal_status: string | null
          status: string
          store: string
          environment: string
          store_subscription_identifier: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: number
          revenuecat_id: string
          user_id?: string | null
          product_id?: number | null
          starts_at: string
          current_period_starts_at: string
          current_period_ends_at?: string | null
          gives_access: boolean
          auto_renewal_status?: string | null
          status: string
          store: string
          environment: string
          store_subscription_identifier?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          revenuecat_id?: string
          user_id?: string | null
          product_id?: number | null
          starts_at?: string
          current_period_starts_at?: string
          current_period_ends_at?: string | null
          gives_access?: boolean
          auto_renewal_status?: string | null
          status?: string
          store?: string
          environment?: string
          store_subscription_identifier?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      thematic_videos: {
        Row: {
          id: number
          title: string
          description: string | null
          url: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          title: string
          description?: string | null
          url: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          title?: string
          description?: string | null
          url?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      video_notes: {
        Row: {
          id: number
          video_id: number
          content: string
          created_at: string | null
        }
        Insert: {
          id?: number
          video_id: number
          content: string
          created_at?: string | null
        }
        Update: {
          id?: number
          video_id?: number
          content?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_notes_video_id_fkey"
            columns: ["video_id"]
            referencedRelation: "videos"
            referencedColumns: ["id"]
          }
        ]
      }
      video_transcripts: {
        Row: {
          id: number
          video_id: number | null
          transcript: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          video_id?: number | null
          transcript: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          video_id?: number | null
          transcript?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_transcripts_video_id_fkey"
            columns: ["video_id"]
            referencedRelation: "videos"
            referencedColumns: ["id"]
          }
        ]
      }
      videos: {
        Row: {
          id: number
          user_id: string | null
          mux_asset_id: string
          mux_playback_id: string
          status: string | null
          duration: number | null
          aspect_ratio: string | null
          created_at: string | null
          updated_at: string | null
          airtable_record_id: string | null
        }
        Insert: {
          id: number
          user_id?: string | null
          mux_asset_id: string
          mux_playback_id: string
          status?: string | null
          duration?: number | null
          aspect_ratio?: string | null
          created_at?: string | null
          updated_at?: string | null
          airtable_record_id?: string | null
        }
        Update: {
          id?: number
          user_id?: string | null
          mux_asset_id?: string
          mux_playback_id?: string
          status?: string | null
          duration?: number | null
          aspect_ratio?: string | null
          created_at?: string | null
          updated_at?: string | null
          airtable_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never