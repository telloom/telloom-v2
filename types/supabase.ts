export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      _ListenerPromptViews: {
        Row: {
          A: string
          B: string
        }
        Insert: {
          A: string
          B: string
        }
        Update: {
          A?: string
          B?: string
        }
        Relationships: [
          {
            foreignKeyName: "_ListenerPromptViews_A_fkey"
            columns: ["A"]
            isOneToOne: false
            referencedRelation: "ProfileListener"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "_ListenerPromptViews_B_fkey"
            columns: ["B"]
            isOneToOne: false
            referencedRelation: "PromptResponse"
            referencedColumns: ["id"]
          },
        ]
      }
      _ListenerVideoViews: {
        Row: {
          A: string
          B: string
        }
        Insert: {
          A: string
          B: string
        }
        Update: {
          A?: string
          B?: string
        }
        Relationships: [
          {
            foreignKeyName: "_ListenerVideoViews_A_fkey"
            columns: ["A"]
            isOneToOne: false
            referencedRelation: "ProfileListener"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "_ListenerVideoViews_B_fkey"
            columns: ["B"]
            isOneToOne: false
            referencedRelation: "Video"
            referencedColumns: ["id"]
          },
        ]
      }
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      _PromptResponseToThematicVideo: {
        Row: {
          A: string
          B: string
        }
        Insert: {
          A: string
          B: string
        }
        Update: {
          A?: string
          B?: string
        }
        Relationships: [
          {
            foreignKeyName: "_PromptResponseToThematicVideo_A_fkey"
            columns: ["A"]
            isOneToOne: false
            referencedRelation: "PromptResponse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "_PromptResponseToThematicVideo_B_fkey"
            columns: ["B"]
            isOneToOne: false
            referencedRelation: "ThematicVideo"
            referencedColumns: ["id"]
          },
        ]
      }
      Entitlement: {
        Row: {
          createdAt: string | null
          displayName: string
          id: string
          lookupKey: string
          revenuecatId: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          displayName: string
          id?: string
          lookupKey: string
          revenuecatId: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          displayName?: string
          id?: string
          lookupKey?: string
          revenuecatId?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      Invitation: {
        Row: {
          acceptedAt: string | null
          createdAt: string
          id: string
          inviteeEmail: string
          inviterId: string | null
          role: Database["public"]["Enums"]["Role"]
          sharerId: string
          status: Database["public"]["Enums"]["InvitationStatus"]
          token: string
          updatedAt: string
        }
        Insert: {
          acceptedAt?: string | null
          createdAt?: string
          id?: string
          inviteeEmail: string
          inviterId?: string | null
          role: Database["public"]["Enums"]["Role"]
          sharerId: string
          status?: Database["public"]["Enums"]["InvitationStatus"]
          token: string
          updatedAt: string
        }
        Update: {
          acceptedAt?: string | null
          createdAt?: string
          id?: string
          inviteeEmail?: string
          inviterId?: string | null
          role?: Database["public"]["Enums"]["Role"]
          sharerId?: string
          status?: Database["public"]["Enums"]["InvitationStatus"]
          token?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Invitation_inviteeEmail_fkey"
            columns: ["inviteeEmail"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "Invitation_inviterId_fkey"
            columns: ["inviterId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Invitation_sharerId_fkey"
            columns: ["sharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
        ]
      }
      Object: {
        Row: {
          airtableRecordId: string | null
          categoryId: string | null
          createdAt: string | null
          id: string
          objectDescription: string | null
          objectName: string
          promptResponseId: string | null
          updatedAt: string | null
          userId: string | null
        }
        Insert: {
          airtableRecordId?: string | null
          categoryId?: string | null
          createdAt?: string | null
          id?: string
          objectDescription?: string | null
          objectName: string
          promptResponseId?: string | null
          updatedAt?: string | null
          userId?: string | null
        }
        Update: {
          airtableRecordId?: string | null
          categoryId?: string | null
          createdAt?: string | null
          id?: string
          objectDescription?: string | null
          objectName?: string
          promptResponseId?: string | null
          updatedAt?: string | null
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Object_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "ObjectCategory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Object_promptResponseId_fkey"
            columns: ["promptResponseId"]
            isOneToOne: false
            referencedRelation: "PromptResponse"
            referencedColumns: ["id"]
          },
        ]
      }
      ObjectCategory: {
        Row: {
          airtableRecordId: string | null
          categoryName: string
          createdAt: string | null
          description: string | null
          id: string
          updatedAt: string | null
        }
        Insert: {
          airtableRecordId?: string | null
          categoryName: string
          createdAt?: string | null
          description?: string | null
          id?: string
          updatedAt?: string | null
        }
        Update: {
          airtableRecordId?: string | null
          categoryName?: string
          createdAt?: string | null
          description?: string | null
          id?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      Offering: {
        Row: {
          createdAt: string | null
          displayName: string
          id: string
          isCurrent: boolean
          lookupKey: string
          revenuecatId: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          displayName: string
          id?: string
          isCurrent: boolean
          lookupKey: string
          revenuecatId: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          displayName?: string
          id?: string
          isCurrent?: boolean
          lookupKey?: string
          revenuecatId?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      Package: {
        Row: {
          createdAt: string | null
          displayName: string
          id: string
          lookupKey: string
          offeringId: string | null
          position: number | null
          productId: string | null
          revenuecatId: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          displayName: string
          id?: string
          lookupKey: string
          offeringId?: string | null
          position?: number | null
          productId?: string | null
          revenuecatId: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          displayName?: string
          id?: string
          lookupKey?: string
          offeringId?: string | null
          position?: number | null
          productId?: string | null
          revenuecatId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Package_offeringId_fkey"
            columns: ["offeringId"]
            isOneToOne: false
            referencedRelation: "Offering"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Package_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "Product"
            referencedColumns: ["id"]
          },
        ]
      }
      PersonTag: {
        Row: {
          createdAt: string | null
          id: string
          name: string
          profileSharerId: string
          relation: Database["public"]["Enums"]["person_relation"]
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          id?: string
          name: string
          profileSharerId: string
          relation: Database["public"]["Enums"]["person_relation"]
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          id?: string
          name?: string
          profileSharerId?: string
          relation?: Database["public"]["Enums"]["person_relation"]
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_person_tag_profile_sharer"
            columns: ["profileSharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
        ]
      }
      Product: {
        Row: {
          createdAt: string | null
          displayName: string | null
          id: string
          revenuecatId: string
          storeIdentifier: string
          type: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          displayName?: string | null
          id?: string
          revenuecatId: string
          storeIdentifier: string
          type: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          displayName?: string | null
          id?: string
          revenuecatId?: string
          storeIdentifier?: string
          type?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      Profile: {
        Row: {
          addressCity: string | null
          addressState: string | null
          addressStreet: string | null
          addressUnit: string | null
          addressZipcode: string | null
          airtableRecordId: string | null
          avatarUrl: string | null
          createdAt: string
          email: string | null
          executorEmail: string | null
          executorFirstName: string | null
          executorLastName: string | null
          executorPhone: string | null
          executorRelation: string | null
          firstName: string | null
          fullName: string | null
          id: string
          isAdmin: boolean
          lastName: string | null
          passwordHash: string | null
          phone: string | null
          revenuecatAppUserId: string | null
          status: string | null
          updatedAt: string
          username: string | null
        }
        Insert: {
          addressCity?: string | null
          addressState?: string | null
          addressStreet?: string | null
          addressUnit?: string | null
          addressZipcode?: string | null
          airtableRecordId?: string | null
          avatarUrl?: string | null
          createdAt?: string
          email?: string | null
          executorEmail?: string | null
          executorFirstName?: string | null
          executorLastName?: string | null
          executorPhone?: string | null
          executorRelation?: string | null
          firstName?: string | null
          fullName?: string | null
          id: string
          isAdmin?: boolean
          lastName?: string | null
          passwordHash?: string | null
          phone?: string | null
          revenuecatAppUserId?: string | null
          status?: string | null
          updatedAt: string
          username?: string | null
        }
        Update: {
          addressCity?: string | null
          addressState?: string | null
          addressStreet?: string | null
          addressUnit?: string | null
          addressZipcode?: string | null
          airtableRecordId?: string | null
          avatarUrl?: string | null
          createdAt?: string
          email?: string | null
          executorEmail?: string | null
          executorFirstName?: string | null
          executorLastName?: string | null
          executorPhone?: string | null
          executorRelation?: string | null
          firstName?: string | null
          fullName?: string | null
          id?: string
          isAdmin?: boolean
          lastName?: string | null
          passwordHash?: string | null
          phone?: string | null
          revenuecatAppUserId?: string | null
          status?: string | null
          updatedAt?: string
          username?: string | null
        }
        Relationships: []
      }
      ProfileExecutor: {
        Row: {
          createdAt: string
          executorId: string
          id: string
          sharerId: string
        }
        Insert: {
          createdAt?: string
          executorId: string
          id?: string
          sharerId: string
        }
        Update: {
          createdAt?: string
          executorId?: string
          id?: string
          sharerId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProfileExecutor_executorId_fkey"
            columns: ["executorId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProfileExecutor_sharerId_fkey"
            columns: ["sharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
        ]
      }
      ProfileListener: {
        Row: {
          createdAt: string
          hasAccess: boolean
          id: string
          lastViewed: string | null
          listenerId: string
          notifications: boolean
          sharedSince: string
          sharerId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          hasAccess?: boolean
          id?: string
          lastViewed?: string | null
          listenerId: string
          notifications?: boolean
          sharedSince?: string
          sharerId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          hasAccess?: boolean
          id?: string
          lastViewed?: string | null
          listenerId?: string
          notifications?: boolean
          sharedSince?: string
          sharerId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProfileListener_listenerId_fkey"
            columns: ["listenerId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProfileListener_sharerId_fkey"
            columns: ["sharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
        ]
      }
      ProfileRole: {
        Row: {
          id: string
          profileId: string
          role: Database["public"]["Enums"]["Role"]
        }
        Insert: {
          id: string
          profileId: string
          role: Database["public"]["Enums"]["Role"]
        }
        Update: {
          id?: string
          profileId?: string
          role?: Database["public"]["Enums"]["Role"]
        }
        Relationships: [
          {
            foreignKeyName: "ProfileRole_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
      ProfileSharer: {
        Row: {
          createdAt: string
          id: string
          profileId: string
          subscriptionStatus: boolean
        }
        Insert: {
          createdAt?: string
          id?: string
          profileId: string
          subscriptionStatus: boolean
        }
        Update: {
          createdAt?: string
          id?: string
          profileId?: string
          subscriptionStatus?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ProfileSharer_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
      Prompt: {
        Row: {
          airtableId: string | null
          categoryAirtableId: string | null
          createdAt: string | null
          id: string
          isContextEstablishing: boolean | null
          isObjectPrompt: boolean | null
          promptCategoryId: string | null
          promptText: string
          promptType: string | null
          search_vector: unknown | null
          updatedAt: string | null
        }
        Insert: {
          airtableId?: string | null
          categoryAirtableId?: string | null
          createdAt?: string | null
          id?: string
          isContextEstablishing?: boolean | null
          isObjectPrompt?: boolean | null
          promptCategoryId?: string | null
          promptText: string
          promptType?: string | null
          search_vector?: unknown | null
          updatedAt?: string | null
        }
        Update: {
          airtableId?: string | null
          categoryAirtableId?: string | null
          createdAt?: string | null
          id?: string
          isContextEstablishing?: boolean | null
          isObjectPrompt?: boolean | null
          promptCategoryId?: string | null
          promptText?: string
          promptType?: string | null
          search_vector?: unknown | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Prompt_promptCategoryId_fkey"
            columns: ["promptCategoryId"]
            isOneToOne: false
            referencedRelation: "PromptCategory"
            referencedColumns: ["id"]
          },
        ]
      }
      PromptCategory: {
        Row: {
          airtableId: string | null
          category: string | null
          createdAt: string | null
          description: string | null
          id: string
          theme: Database["public"]["Enums"]["Theme"] | null
          updatedAt: string | null
        }
        Insert: {
          airtableId?: string | null
          category?: string | null
          createdAt?: string | null
          description?: string | null
          id?: string
          theme?: Database["public"]["Enums"]["Theme"] | null
          updatedAt?: string | null
        }
        Update: {
          airtableId?: string | null
          category?: string | null
          createdAt?: string | null
          description?: string | null
          id?: string
          theme?: Database["public"]["Enums"]["Theme"] | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      PromptResponse: {
        Row: {
          airtableRecordId: string | null
          createdAt: string | null
          id: string
          privacyLevel: string
          profileSharerId: string
          promptId: string | null
          responseNotes: string | null
          search_vector: unknown | null
          updatedAt: string | null
          videoId: string | null
        }
        Insert: {
          airtableRecordId?: string | null
          createdAt?: string | null
          id?: string
          privacyLevel?: string
          profileSharerId: string
          promptId?: string | null
          responseNotes?: string | null
          search_vector?: unknown | null
          updatedAt?: string | null
          videoId?: string | null
        }
        Update: {
          airtableRecordId?: string | null
          createdAt?: string | null
          id?: string
          privacyLevel?: string
          profileSharerId?: string
          promptId?: string | null
          responseNotes?: string | null
          search_vector?: unknown | null
          updatedAt?: string | null
          videoId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "PromptResponse_profileSharerId_fkey"
            columns: ["profileSharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PromptResponse_promptId_fkey"
            columns: ["promptId"]
            isOneToOne: false
            referencedRelation: "Prompt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PromptResponse_videoId_fkey"
            columns: ["videoId"]
            isOneToOne: true
            referencedRelation: "Video"
            referencedColumns: ["id"]
          },
        ]
      }
      PromptResponseAttachment: {
        Row: {
          dateCaptured: string | null
          description: string | null
          estimatedYear: number | null
          fileName: string
          fileSize: number | null
          fileType: string
          fileUrl: string
          id: string
          profileSharerId: string
          promptResponseId: string
          title: string | null
          uploadedAt: string
          yearCaptured: number | null
        }
        Insert: {
          dateCaptured?: string | null
          description?: string | null
          estimatedYear?: number | null
          fileName: string
          fileSize?: number | null
          fileType: string
          fileUrl: string
          id?: string
          profileSharerId: string
          promptResponseId: string
          title?: string | null
          uploadedAt?: string
          yearCaptured?: number | null
        }
        Update: {
          dateCaptured?: string | null
          description?: string | null
          estimatedYear?: number | null
          fileName?: string
          fileSize?: number | null
          fileType?: string
          fileUrl?: string
          id?: string
          profileSharerId?: string
          promptResponseId?: string
          title?: string | null
          uploadedAt?: string
          yearCaptured?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "PromptResponseAttachment_profileSharerId_fkey"
            columns: ["profileSharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PromptResponseAttachment_promptResponseId_fkey"
            columns: ["promptResponseId"]
            isOneToOne: false
            referencedRelation: "PromptResponse"
            referencedColumns: ["id"]
          },
        ]
      }
      PromptResponseAttachmentPersonTag: {
        Row: {
          createdAt: string | null
          id: string
          personTagId: string
          promptResponseAttachmentId: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          id?: string
          personTagId: string
          promptResponseAttachmentId: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          id?: string
          personTagId?: string
          promptResponseAttachmentId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_attachment_tag_attachment"
            columns: ["promptResponseAttachmentId"]
            isOneToOne: false
            referencedRelation: "PromptResponseAttachment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attachment_tag_person_tag"
            columns: ["personTagId"]
            isOneToOne: false
            referencedRelation: "PersonTag"
            referencedColumns: ["id"]
          },
        ]
      }
      PromptResponseFavorite: {
        Row: {
          favoritedAt: string
          id: string
          profileId: string
          promptResponseId: string
        }
        Insert: {
          favoritedAt?: string
          id?: string
          profileId: string
          promptResponseId: string
        }
        Update: {
          favoritedAt?: string
          id?: string
          profileId?: string
          promptResponseId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PromptResponseFavorite_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PromptResponseFavorite_promptResponseId_fkey"
            columns: ["promptResponseId"]
            isOneToOne: false
            referencedRelation: "PromptResponse"
            referencedColumns: ["id"]
          },
        ]
      }
      PromptResponseRecentlyWatched: {
        Row: {
          id: string
          profileId: string
          promptResponseId: string
          watchedAt: string
        }
        Insert: {
          id?: string
          profileId: string
          promptResponseId: string
          watchedAt?: string
        }
        Update: {
          id?: string
          profileId?: string
          promptResponseId?: string
          watchedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "PromptResponseRecentlyWatched_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PromptResponseRecentlyWatched_promptResponseId_fkey"
            columns: ["promptResponseId"]
            isOneToOne: false
            referencedRelation: "PromptResponse"
            referencedColumns: ["id"]
          },
        ]
      }
      Purchase: {
        Row: {
          createdAt: string | null
          environment: string
          id: string
          productId: string | null
          purchasedAt: string
          revenuecatId: string
          revenueInUsd: number
          status: string
          store: string
          storePurchaseIdentifier: string | null
          updatedAt: string | null
          userId: string | null
        }
        Insert: {
          createdAt?: string | null
          environment: string
          id?: string
          productId?: string | null
          purchasedAt: string
          revenuecatId: string
          revenueInUsd: number
          status: string
          store: string
          storePurchaseIdentifier?: string | null
          updatedAt?: string | null
          userId?: string | null
        }
        Update: {
          createdAt?: string | null
          environment?: string
          id?: string
          productId?: string | null
          purchasedAt?: string
          revenuecatId?: string
          revenueInUsd?: number
          status?: string
          store?: string
          storePurchaseIdentifier?: string | null
          updatedAt?: string | null
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Purchase_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "Product"
            referencedColumns: ["id"]
          },
        ]
      }
      ResponsePermission: {
        Row: {
          createdAt: string | null
          id: string
          permissionLevel: string
          responseId: string | null
          updatedAt: string | null
          userId: string | null
        }
        Insert: {
          createdAt?: string | null
          id?: string
          permissionLevel: string
          responseId?: string | null
          updatedAt?: string | null
          userId?: string | null
        }
        Update: {
          createdAt?: string | null
          id?: string
          permissionLevel?: string
          responseId?: string | null
          updatedAt?: string | null
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ResponsePermission_responseId_fkey"
            columns: ["responseId"]
            isOneToOne: false
            referencedRelation: "PromptResponse"
            referencedColumns: ["id"]
          },
        ]
      }
      Subscription: {
        Row: {
          autoRenewalStatus: string | null
          createdAt: string | null
          currentPeriodEndsAt: string | null
          currentPeriodStartsAt: string
          environment: string
          givesAccess: boolean
          id: string
          productId: string | null
          revenuecatId: string
          startsAt: string
          status: string
          store: string
          storeSubscriptionIdentifier: string | null
          updatedAt: string | null
          userId: string | null
        }
        Insert: {
          autoRenewalStatus?: string | null
          createdAt?: string | null
          currentPeriodEndsAt?: string | null
          currentPeriodStartsAt: string
          environment: string
          givesAccess: boolean
          id?: string
          productId?: string | null
          revenuecatId: string
          startsAt: string
          status: string
          store: string
          storeSubscriptionIdentifier?: string | null
          updatedAt?: string | null
          userId?: string | null
        }
        Update: {
          autoRenewalStatus?: string | null
          createdAt?: string | null
          currentPeriodEndsAt?: string | null
          currentPeriodStartsAt?: string
          environment?: string
          givesAccess?: boolean
          id?: string
          productId?: string | null
          revenuecatId?: string
          startsAt?: string
          status?: string
          store?: string
          storeSubscriptionIdentifier?: string | null
          updatedAt?: string | null
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Subscription_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "Product"
            referencedColumns: ["id"]
          },
        ]
      }
      SubscriptionEntitlement: {
        Row: {
          createdAt: string | null
          entitlementId: string
          id: string
          subscriptionId: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          entitlementId: string
          id?: string
          subscriptionId: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          entitlementId?: string
          id?: string
          subscriptionId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SubscriptionEntitlement_entitlementId_fkey"
            columns: ["entitlementId"]
            isOneToOne: false
            referencedRelation: "Entitlement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SubscriptionEntitlement_subscriptionId_fkey"
            columns: ["subscriptionId"]
            isOneToOne: false
            referencedRelation: "Subscription"
            referencedColumns: ["id"]
          },
        ]
      }
      ThematicVideo: {
        Row: {
          airtableRecordId: string | null
          aspectRatio: string | null
          createdAt: string | null
          description: string | null
          duration: number | null
          id: string
          languageCode: string | null
          maxFrameRate: number | null
          maxHeight: number | null
          maxWidth: number | null
          metadata: Json | null
          muxAssetId: string | null
          muxPlaybackId: string | null
          muxUploadId: string | null
          passthrough: string | null
          profileSharerId: string
          resolutionTier: string | null
          title: string
          updatedAt: string | null
          url: string
          videoQuality: string | null
        }
        Insert: {
          airtableRecordId?: string | null
          aspectRatio?: string | null
          createdAt?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          languageCode?: string | null
          maxFrameRate?: number | null
          maxHeight?: number | null
          maxWidth?: number | null
          metadata?: Json | null
          muxAssetId?: string | null
          muxPlaybackId?: string | null
          muxUploadId?: string | null
          passthrough?: string | null
          profileSharerId: string
          resolutionTier?: string | null
          title: string
          updatedAt?: string | null
          url: string
          videoQuality?: string | null
        }
        Update: {
          airtableRecordId?: string | null
          aspectRatio?: string | null
          createdAt?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          languageCode?: string | null
          maxFrameRate?: number | null
          maxHeight?: number | null
          maxWidth?: number | null
          metadata?: Json | null
          muxAssetId?: string | null
          muxPlaybackId?: string | null
          muxUploadId?: string | null
          passthrough?: string | null
          profileSharerId?: string
          resolutionTier?: string | null
          title?: string
          updatedAt?: string | null
          url?: string
          videoQuality?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ThematicVideo_profileSharerId_fkey"
            columns: ["profileSharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
        ]
      }
      TopicFavorite: {
        Row: {
          createdAt: string
          id: string
          profileId: string
          promptCategoryId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          profileId: string
          promptCategoryId: string
        }
        Update: {
          createdAt?: string
          id?: string
          profileId?: string
          promptCategoryId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TopicFavorite_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TopicFavorite_promptCategoryId_fkey"
            columns: ["promptCategoryId"]
            isOneToOne: false
            referencedRelation: "PromptCategory"
            referencedColumns: ["id"]
          },
        ]
      }
      TopicQueueItem: {
        Row: {
          createdAt: string
          id: string
          profileId: string
          promptCategoryId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          profileId: string
          promptCategoryId: string
        }
        Update: {
          createdAt?: string
          id?: string
          profileId?: string
          promptCategoryId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TopicQueueItem_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TopicQueueItem_promptCategoryId_fkey"
            columns: ["promptCategoryId"]
            isOneToOne: false
            referencedRelation: "PromptCategory"
            referencedColumns: ["id"]
          },
        ]
      }
      Video: {
        Row: {
          airtableRecordId: string | null
          aspectRatio: string | null
          createdAt: string | null
          duration: number | null
          id: string
          languageCode: string | null
          maxFrameRate: number | null
          maxHeight: number | null
          maxWidth: number | null
          muxAssetId: string | null
          muxPlaybackId: string | null
          muxUploadId: string | null
          passthrough: string | null
          profileSharerId: string
          promptId: string | null
          resolutionTier: string | null
          status: Database["public"]["Enums"]["VideoStatus"]
          updatedAt: string | null
          videoQuality: string | null
        }
        Insert: {
          airtableRecordId?: string | null
          aspectRatio?: string | null
          createdAt?: string | null
          duration?: number | null
          id?: string
          languageCode?: string | null
          maxFrameRate?: number | null
          maxHeight?: number | null
          maxWidth?: number | null
          muxAssetId?: string | null
          muxPlaybackId?: string | null
          muxUploadId?: string | null
          passthrough?: string | null
          profileSharerId: string
          promptId?: string | null
          resolutionTier?: string | null
          status?: Database["public"]["Enums"]["VideoStatus"]
          updatedAt?: string | null
          videoQuality?: string | null
        }
        Update: {
          airtableRecordId?: string | null
          aspectRatio?: string | null
          createdAt?: string | null
          duration?: number | null
          id?: string
          languageCode?: string | null
          maxFrameRate?: number | null
          maxHeight?: number | null
          maxWidth?: number | null
          muxAssetId?: string | null
          muxPlaybackId?: string | null
          muxUploadId?: string | null
          passthrough?: string | null
          profileSharerId?: string
          promptId?: string | null
          resolutionTier?: string | null
          status?: Database["public"]["Enums"]["VideoStatus"]
          updatedAt?: string | null
          videoQuality?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Video_profileSharerId_fkey"
            columns: ["profileSharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Video_promptId_fkey"
            columns: ["promptId"]
            isOneToOne: false
            referencedRelation: "Prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      VideoTranscript: {
        Row: {
          createdAt: string
          id: string
          transcript: string
          updatedAt: string
          videoId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          transcript: string
          updatedAt: string
          videoId: string
        }
        Update: {
          createdAt?: string
          id?: string
          transcript?: string
          updatedAt?: string
          videoId?: string
        }
        Relationships: [
          {
            foreignKeyName: "VideoTranscript_videoId_fkey"
            columns: ["videoId"]
            isOneToOne: false
            referencedRelation: "Video"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_sharer_topic_progress: {
        Args: {
          sharer_profile_id: string
          topic_id: string
        }
        Returns: {
          total_prompts: number
          completed_prompts: number
          progress_percent: number
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      InvitationStatus: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"
      person_relation:
        | "Spouse"
        | "Partner"
        | "Mother"
        | "Father"
        | "Sister"
        | "Brother"
        | "Daughter"
        | "Son"
        | "Grandmother"
        | "Grandfather"
        | "GreatGrandmother"
        | "GreatGrandfather"
        | "Granddaughter"
        | "Grandson"
        | "GreatGranddaughter"
        | "GreatGrandson"
        | "Aunt"
        | "Uncle"
        | "GreatAunt"
        | "GreatUncle"
        | "Niece"
        | "Nephew"
        | "Cousin"
        | "Friend"
        | "Coworker"
        | "Mentor"
        | "Teacher"
        | "Boss"
        | "MotherInLaw"
        | "FatherInLaw"
        | "SisterInLaw"
        | "BrotherInLaw"
        | "StepMother"
        | "StepFather"
        | "StepSister"
        | "StepBrother"
        | "StepDaughter"
        | "StepSon"
        | "Godmother"
        | "Godfather"
        | "Godchild"
        | "Other"
      Role: "LISTENER" | "SHARER" | "EXECUTOR" | "ADMIN"
      Theme:
        | "LIFE_EXPERIENCES"
        | "HEALTH_AND_WELLBEING"
        | "WELLBEING"
        | "BUSINESS"
        | "FOOD"
        | "CUSTOM"
        | "VALUES_AND_BELIEFS"
        | "PERSONAL_HISTORY"
        | "CAREER_AND_EDUCATION"
        | "CHALLENGES_AND_RESILIENCE"
        | "RELATIONSHIPS_AND_COMMUNITY"
        | "HOBBIES_AND_INTERESTS"
        | "CULTURAL_AND_HERITAGE"
      VideoStatus:
        | "WAITING"
        | "PREPARING"
        | "ASSET_CREATED"
        | "READY"
        | "ERRORED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
