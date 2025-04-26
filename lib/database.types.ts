export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
            referencedRelation: "TopicVideo"
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
      FollowRequest: {
        Row: {
          approvedAt: string | null
          createdAt: string | null
          deniedAt: string | null
          id: string
          requestorId: string
          sharerId: string
          status: Database["public"]["Enums"]["follow_request_status"]
          updatedAt: string | null
        }
        Insert: {
          approvedAt?: string | null
          createdAt?: string | null
          deniedAt?: string | null
          id?: string
          requestorId: string
          sharerId: string
          status?: Database["public"]["Enums"]["follow_request_status"]
          updatedAt?: string | null
        }
        Update: {
          approvedAt?: string | null
          createdAt?: string | null
          deniedAt?: string | null
          id?: string
          requestorId?: string
          sharerId?: string
          status?: Database["public"]["Enums"]["follow_request_status"]
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "FollowRequest_requestorId_fkey"
            columns: ["requestorId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FollowRequest_sharerId_fkey"
            columns: ["sharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
        ]
      }
      Invitation: {
        Row: {
          acceptedAt: string | null
          createdAt: string
          executorFirstName: string | null
          executorLastName: string | null
          executorPhone: string | null
          executorRelation: string | null
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
          executorFirstName?: string | null
          executorLastName?: string | null
          executorPhone?: string | null
          executorRelation?: string | null
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
          executorFirstName?: string | null
          executorLastName?: string | null
          executorPhone?: string | null
          executorRelation?: string | null
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
      Notification: {
        Row: {
          createdAt: string
          data: Json | null
          id: string
          isRead: boolean
          message: string
          type: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          data?: Json | null
          id?: string
          isRead?: boolean
          message: string
          type: string
          updatedAt?: string
          userId: string
        }
        Update: {
          createdAt?: string
          data?: Json | null
          id?: string
          isRead?: boolean
          message?: string
          type?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "Profile"
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
          addressState: Database["public"]["Enums"]["us_state"] | null
          addressStreet: string | null
          addressUnit: string | null
          addressZipcode: string | null
          airtableRecordId: string | null
          avatarUrl: string | null
          createdAt: string
          email: string | null
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
          addressState?: Database["public"]["Enums"]["us_state"] | null
          addressStreet?: string | null
          addressUnit?: string | null
          addressZipcode?: string | null
          airtableRecordId?: string | null
          avatarUrl?: string | null
          createdAt?: string
          email?: string | null
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
          addressState?: Database["public"]["Enums"]["us_state"] | null
          addressStreet?: string | null
          addressUnit?: string | null
          addressZipcode?: string | null
          airtableRecordId?: string | null
          avatarUrl?: string | null
          createdAt?: string
          email?: string | null
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
        Relationships: [
          {
            foreignKeyName: "fk_profile_addressstate"
            columns: ["addressState"]
            isOneToOne: false
            referencedRelation: "USState"
            referencedColumns: ["abbreviation"]
          },
        ]
      }
      ProfileExecutor: {
        Row: {
          createdAt: string
          executorId: string
          id: string
          sharerId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          executorId: string
          id?: string
          sharerId: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          executorId?: string
          id?: string
          sharerId?: string
          updatedAt?: string
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
          updatedAt: string | null
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
          updatedAt?: string | null
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
          updatedAt?: string | null
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
          createdAt: string
          id: string
          profileId: string
          role: Database["public"]["Enums"]["Role"]
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          profileId: string
          role: Database["public"]["Enums"]["Role"]
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          id?: string
          profileId?: string
          role?: Database["public"]["Enums"]["Role"]
          updatedAt?: string
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
          summary: string | null
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
          summary?: string | null
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
          summary?: string | null
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
          fileName: string
          fileSize: number | null
          fileType: string
          fileUrl: string
          id: string
          profileSharerId: string
          promptResponseId: string
          title: string | null
          updatedAt: string
          uploadedAt: string
          yearCaptured: number | null
        }
        Insert: {
          dateCaptured?: string | null
          description?: string | null
          fileName: string
          fileSize?: number | null
          fileType: string
          fileUrl: string
          id?: string
          profileSharerId: string
          promptResponseId: string
          title?: string | null
          updatedAt?: string
          uploadedAt?: string
          yearCaptured?: number | null
        }
        Update: {
          dateCaptured?: string | null
          description?: string | null
          fileName?: string
          fileSize?: number | null
          fileType?: string
          fileUrl?: string
          id?: string
          profileSharerId?: string
          promptResponseId?: string
          title?: string | null
          updatedAt?: string
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
      TopicFavorite: {
        Row: {
          createdAt: string
          executorId: string | null
          id: string
          profileId: string
          promptCategoryId: string
          role: string | null
          sharerId: string | null
        }
        Insert: {
          createdAt?: string
          executorId?: string | null
          id?: string
          profileId: string
          promptCategoryId: string
          role?: string | null
          sharerId?: string | null
        }
        Update: {
          createdAt?: string
          executorId?: string | null
          id?: string
          profileId?: string
          promptCategoryId?: string
          role?: string | null
          sharerId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_topicfavorite_sharer"
            columns: ["sharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TopicFavorite_executorId_fkey"
            columns: ["executorId"]
            isOneToOne: false
            referencedRelation: "ProfileExecutor"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "TopicFavorite_sharerId_fkey"
            columns: ["sharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
        ]
      }
      TopicQueueItem: {
        Row: {
          createdAt: string
          executorId: string | null
          id: string
          profileId: string
          promptCategoryId: string
          role: string | null
          sharerId: string | null
        }
        Insert: {
          createdAt?: string
          executorId?: string | null
          id?: string
          profileId: string
          promptCategoryId: string
          role?: string | null
          sharerId?: string | null
        }
        Update: {
          createdAt?: string
          executorId?: string | null
          id?: string
          profileId?: string
          promptCategoryId?: string
          role?: string | null
          sharerId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_topicqueueitem_sharer"
            columns: ["sharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TopicQueueItem_executorId_fkey"
            columns: ["executorId"]
            isOneToOne: false
            referencedRelation: "ProfileExecutor"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "TopicQueueItem_sharerId_fkey"
            columns: ["sharerId"]
            isOneToOne: false
            referencedRelation: "ProfileSharer"
            referencedColumns: ["id"]
          },
        ]
      }
      TopicVideo: {
        Row: {
          airtableRecordId: string | null
          aspectRatio: string | null
          createdAt: string | null
          dateRecorded: string | null
          description: string | null
          duration: number | null
          errorMessage: string | null
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
          promptCategoryId: string | null
          resolutionTier: string | null
          status: Database["public"]["Enums"]["VideoStatus"]
          summary: string | null
          title: string
          updatedAt: string | null
          url: string | null
          videoQuality: string | null
        }
        Insert: {
          airtableRecordId?: string | null
          aspectRatio?: string | null
          createdAt?: string | null
          dateRecorded?: string | null
          description?: string | null
          duration?: number | null
          errorMessage?: string | null
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
          promptCategoryId?: string | null
          resolutionTier?: string | null
          status?: Database["public"]["Enums"]["VideoStatus"]
          summary?: string | null
          title: string
          updatedAt?: string | null
          url?: string | null
          videoQuality?: string | null
        }
        Update: {
          airtableRecordId?: string | null
          aspectRatio?: string | null
          createdAt?: string | null
          dateRecorded?: string | null
          description?: string | null
          duration?: number | null
          errorMessage?: string | null
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
          promptCategoryId?: string | null
          resolutionTier?: string | null
          status?: Database["public"]["Enums"]["VideoStatus"]
          summary?: string | null
          title?: string
          updatedAt?: string | null
          url?: string | null
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
          {
            foreignKeyName: "TopicVideo_promptCategoryId_fkey"
            columns: ["promptCategoryId"]
            isOneToOne: false
            referencedRelation: "PromptCategory"
            referencedColumns: ["id"]
          },
        ]
      }
      TopicVideoDownload: {
        Row: {
          downloadedAt: string | null
          id: string
          last_attempted: string | null
          muxAssetId: string
          profileId: string
          quality: string
          retries: number | null
          status: string | null
        }
        Insert: {
          downloadedAt?: string | null
          id?: string
          last_attempted?: string | null
          muxAssetId: string
          profileId: string
          quality?: string
          retries?: number | null
          status?: string | null
        }
        Update: {
          downloadedAt?: string | null
          id?: string
          last_attempted?: string | null
          muxAssetId?: string
          profileId?: string
          quality?: string
          retries?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "TopicVideoDownload_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
      TopicVideoTranscript: {
        Row: {
          createdAt: string | null
          id: string
          language: string | null
          muxAssetId: string | null
          muxTrackId: string | null
          name: string | null
          source: string | null
          topicVideoId: string
          transcript: string | null
          type: string | null
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          id?: string
          language?: string | null
          muxAssetId?: string | null
          muxTrackId?: string | null
          name?: string | null
          source?: string | null
          topicVideoId: string
          transcript?: string | null
          type?: string | null
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          id?: string
          language?: string | null
          muxAssetId?: string | null
          muxTrackId?: string | null
          name?: string | null
          source?: string | null
          topicVideoId?: string
          transcript?: string | null
          type?: string | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "TopicVideoTranscript_topicVideoId_fkey"
            columns: ["topicVideoId"]
            isOneToOne: false
            referencedRelation: "TopicVideo"
            referencedColumns: ["id"]
          },
        ]
      }
      USState: {
        Row: {
          abbreviation: Database["public"]["Enums"]["us_state"]
          fullname: string
          timezone: string
        }
        Insert: {
          abbreviation: Database["public"]["Enums"]["us_state"]
          fullname: string
          timezone: string
        }
        Update: {
          abbreviation?: Database["public"]["Enums"]["us_state"]
          fullname?: string
          timezone?: string
        }
        Relationships: []
      }
      Video: {
        Row: {
          airtableRecordId: string | null
          aspectRatio: string | null
          createdAt: string | null
          dateRecorded: string | null
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
          dateRecorded?: string | null
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
          dateRecorded?: string | null
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
      VideoDownload: {
        Row: {
          downloadedAt: string
          id: string
          last_attempted: string | null
          muxAssetId: string
          profileId: string
          quality: string
          retries: number | null
          status: string | null
        }
        Insert: {
          downloadedAt?: string
          id?: string
          last_attempted?: string | null
          muxAssetId: string
          profileId: string
          quality?: string
          retries?: number | null
          status?: string | null
        }
        Update: {
          downloadedAt?: string
          id?: string
          last_attempted?: string | null
          muxAssetId?: string
          profileId?: string
          quality?: string
          retries?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "VideoDownload_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
      VideoTranscript: {
        Row: {
          createdAt: string
          id: string
          language: string | null
          muxAssetId: string | null
          muxTrackId: string | null
          name: string | null
          source: string | null
          transcript: string
          type: string | null
          updatedAt: string
          videoId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          language?: string | null
          muxAssetId?: string | null
          muxTrackId?: string | null
          name?: string | null
          source?: string | null
          transcript: string
          type?: string | null
          updatedAt: string
          videoId: string
        }
        Update: {
          createdAt?: string
          id?: string
          language?: string | null
          muxAssetId?: string | null
          muxTrackId?: string | null
          name?: string | null
          source?: string | null
          transcript?: string
          type?: string | null
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
      accept_invitation_by_token: {
        Args: { p_token: string }
        Returns: undefined
      }
      can_manage_attachment: {
        Args: { p_object_name: string }
        Returns: boolean
      }
      cancel_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      check_case_sensitivity: {
        Args: { table_name: string; column_name: string }
        Returns: Json
      }
      check_column_exists: {
        Args: { table_name: string; column_name: string }
        Returns: Json
      }
      check_direct_executor_access: {
        Args: { sharer_id: string }
        Returns: boolean
      }
      check_direct_sharer_access: {
        Args: { sharer_id: string }
        Returns: boolean
      }
      create_invitation: {
        Args: { p_sharer_id: string; p_invitee_email: string; p_role: string }
        Returns: string
      }
      create_profile_executor: {
        Args: { p_executor_id: string; p_sharer_id: string }
        Returns: string
      }
      create_profile_listener: {
        Args: {
          p_listener_id: string
          p_sharer_id: string
          p_shared_since?: string
          p_has_access?: boolean
        }
        Returns: string
      }
      create_test_invitation: {
        Args: { token_value: string; invitee_email: string }
        Returns: Json
      }
      debug_rls_helpers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      exec_sql: {
        Args: { sql: string }
        Returns: undefined
      }
      executor_create_invitation: {
        Args: {
          executor_id: string
          sharer_id: string
          invitee_email: string
          role: string
        }
        Returns: string
      }
      find_invitation_by_id: {
        Args: { invitation_id: string; invitation_token: string }
        Returns: Json
      }
      find_invitation_by_token: {
        Args: { token_value: string }
        Returns: Json
      }
      find_invitation_by_token_case_insensitive: {
        Args: { token_value: string }
        Returns: Json
      }
      generate_attachment_filename: {
        Args: {
          profile_sharer_id: string
          prompt_response_id: string
          original_filename: string
          attachment_id: string
        }
        Returns: string
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_all_invitations: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_attachment_person_tags: {
        Args: { attachment_ids: string[] }
        Returns: Json
      }
      get_attachment_signed_url: {
        Args: { p_file_path: string }
        Returns: Json
      }
      get_executor_for_user: {
        Args: { user_id: string }
        Returns: Json
      }
      get_executor_topic_list: {
        Args: { p_executor_id: string; p_sharer_id: string }
        Returns: {
          id: string
          category: string
          description: string
          theme: string
          prompts: Json
          completed_prompt_count: number
          total_prompt_count: number
          is_favorite: boolean
          is_in_queue: boolean
        }[]
      }
      get_pending_invitations: {
        Args: { email_param: string; role_type?: string }
        Returns: Json
      }
      get_person_tags_for_sharer: {
        Args: { sharer_id: string }
        Returns: Json
      }
      get_policies_for_table: {
        Args: { table_name: string }
        Returns: {
          policyname: unknown
          tablename: unknown
          schemaname: unknown
          roles: unknown[]
          cmd: string
          qual: string
          with_check: string
        }[]
      }
      get_profile_safe: {
        Args: { target_user_id?: string }
        Returns: Json
      }
      get_prompt_category_with_details: {
        Args: { p_category_id: string; p_sharer_id: string }
        Returns: Json
      }
      get_prompt_responses_by_sharer: {
        Args: { sharer_id: string }
        Returns: Json
      }
      get_prompts_for_category: {
        Args:
          | { p_category_id: string }
          | { p_category_id: string; p_sharer_id: string }
        Returns: {
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
        }[]
      }
      get_roles_from_jwt: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_sharer_details_for_executor: {
        Args: { p_sharer_id: string }
        Returns: {
          sharer_id: string
          profile_id: string
          created_at: string
          subscription_status: boolean
          profile_first_name: string
          profile_last_name: string
          profile_avatar_url: string
        }[]
      }
      get_sharer_id_from_jwt: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_sharer_profile_by_user_id: {
        Args: { user_id: string }
        Returns: Json
      }
      get_sharer_topic_list: {
        Args: { p_sharer_profile_id: string }
        Returns: {
          id: string
          category: string
          description: string
          theme: string
          completed_prompt_count: number
          total_prompt_count: number
          is_favorite: boolean
          is_in_queue: boolean
        }[]
      }
      get_sharer_topic_progress: {
        Args: { sharer_profile_id: string; topic_id: string }
        Returns: {
          total_prompts: number
          completed_prompts: number
          progress_percent: number
        }[]
      }
      get_table_schema: {
        Args: { table_name: string }
        Returns: Json
      }
      get_topic_details_for_sharer: {
        Args: { p_topic_id: string }
        Returns: Json
      }
      get_topic_name: {
        Args: { prompt_response_id: string }
        Returns: string
      }
      get_topic_relations: {
        Args: { profile_id: string }
        Returns: Json
      }
      get_user_role_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_role_emergency: {
        Args: { user_id?: string }
        Returns: Json
      }
      handle_follow_request: {
        Args: { sharer_id: string }
        Returns: string
      }
      handle_follow_request_response: {
        Args: { request_id: string; should_approve: boolean }
        Returns: undefined
      }
      handle_invitation_acceptance: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      has_executor_role_from_jwt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_listener_access: {
        Args: { sharer_id: string }
        Returns: boolean
      }
      has_role: {
        Args: { user_id: string; role_name: string }
        Returns: boolean
      }
      has_role_from_jwt: {
        Args: { role_name: string }
        Returns: boolean
      }
      has_sharer_access: {
        Args: { sharer_profile_id: string }
        Returns: boolean
      }
      has_sharer_access_check: {
        Args: { user_id: string; sharer_id: string }
        Returns: boolean
      }
      insert_test_invitation: {
        Args: { token_value: string; invitee_email: string }
        Returns: Json
      }
      is_active_executor_for: {
        Args: { executor_id: string; profile_sharer_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: boolean
      }
      is_admin_simple: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_executor_for: {
        Args: { executor_id: string; sharer_id: string }
        Returns: boolean
      }
      is_executor_for_sharer: {
        Args: { sharer_id: string }
        Returns: boolean
      }
      is_executor_for_sharer_by_profile_id: {
        Args: { sharer_profile_id: string }
        Returns: boolean
      }
      is_listener_for: {
        Args: { listener_id: string; sharer_id: string }
        Returns: boolean
      }
      is_sharer_from_jwt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_sharer_owner: {
        Args: { sharer_id: string }
        Returns: boolean
      }
      is_sharer_owner_by_profile_id: {
        Args: { sharer_profile_id: string }
        Returns: boolean
      }
      list_tables: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      resend_invitation: {
        Args: { p_invitation_id: string }
        Returns: string
      }
      revoke_executor_access: {
        Args: { executor_id: string; sharer_id: string }
        Returns: undefined
      }
      revoke_listener_access: {
        Args: { listener_id: string; sharer_id: string }
        Returns: undefined
      }
      slugify: {
        Args: { "": string }
        Returns: string
      }
      toggle_topic_favorite: {
        Args: {
          p_profile_id: string
          p_category_id: string
          p_role: string
          p_sharer_id?: string
        }
        Returns: Json
      }
      toggle_topic_queue: {
        Args: {
          p_profile_id: string
          p_category_id: string
          p_role: string
          p_sharer_id?: string
        }
        Returns: Json
      }
      update_attachment_details: {
        Args: {
          p_attachment_id: string
          p_title: string
          p_description: string
          p_date_captured: string
          p_year_captured: number
          p_person_tag_ids: string[]
        }
        Returns: undefined
      }
      update_invitation_status: {
        Args: {
          p_invitation_id: string
          p_status: string
          p_accepted_at?: string
        }
        Returns: string
      }
      update_profile_safe: {
        Args: { target_user_id: string; update_payload: Json }
        Returns: Json
      }
    }
    Enums: {
      follow_request_status: "PENDING" | "APPROVED" | "DENIED" | "REVOKED"
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
      us_state:
        | "AL"
        | "AK"
        | "AZ"
        | "AR"
        | "CA"
        | "CO"
        | "CT"
        | "DE"
        | "FL"
        | "GA"
        | "HI"
        | "ID"
        | "IL"
        | "IN"
        | "IA"
        | "KS"
        | "KY"
        | "LA"
        | "ME"
        | "MD"
        | "MA"
        | "MI"
        | "MN"
        | "MS"
        | "MO"
        | "MT"
        | "NE"
        | "NV"
        | "NH"
        | "NJ"
        | "NM"
        | "NY"
        | "NC"
        | "ND"
        | "OH"
        | "OK"
        | "OR"
        | "PA"
        | "RI"
        | "SC"
        | "SD"
        | "TN"
        | "TX"
        | "UT"
        | "VT"
        | "VA"
        | "WA"
        | "WV"
        | "WI"
        | "WY"
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      follow_request_status: ["PENDING", "APPROVED", "DENIED", "REVOKED"],
      InvitationStatus: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"],
      person_relation: [
        "Spouse",
        "Partner",
        "Mother",
        "Father",
        "Sister",
        "Brother",
        "Daughter",
        "Son",
        "Grandmother",
        "Grandfather",
        "GreatGrandmother",
        "GreatGrandfather",
        "Granddaughter",
        "Grandson",
        "GreatGranddaughter",
        "GreatGrandson",
        "Aunt",
        "Uncle",
        "GreatAunt",
        "GreatUncle",
        "Niece",
        "Nephew",
        "Cousin",
        "Friend",
        "Coworker",
        "Mentor",
        "Teacher",
        "Boss",
        "MotherInLaw",
        "FatherInLaw",
        "SisterInLaw",
        "BrotherInLaw",
        "StepMother",
        "StepFather",
        "StepSister",
        "StepBrother",
        "StepDaughter",
        "StepSon",
        "Godmother",
        "Godfather",
        "Godchild",
        "Other",
      ],
      Role: ["LISTENER", "SHARER", "EXECUTOR", "ADMIN"],
      Theme: [
        "LIFE_EXPERIENCES",
        "HEALTH_AND_WELLBEING",
        "WELLBEING",
        "BUSINESS",
        "FOOD",
        "CUSTOM",
        "VALUES_AND_BELIEFS",
        "PERSONAL_HISTORY",
        "CAREER_AND_EDUCATION",
        "CHALLENGES_AND_RESILIENCE",
        "RELATIONSHIPS_AND_COMMUNITY",
        "HOBBIES_AND_INTERESTS",
        "CULTURAL_AND_HERITAGE",
      ],
      us_state: [
        "AL",
        "AK",
        "AZ",
        "AR",
        "CA",
        "CO",
        "CT",
        "DE",
        "FL",
        "GA",
        "HI",
        "ID",
        "IL",
        "IN",
        "IA",
        "KS",
        "KY",
        "LA",
        "ME",
        "MD",
        "MA",
        "MI",
        "MN",
        "MS",
        "MO",
        "MT",
        "NE",
        "NV",
        "NH",
        "NJ",
        "NM",
        "NY",
        "NC",
        "ND",
        "OH",
        "OK",
        "OR",
        "PA",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VT",
        "VA",
        "WA",
        "WV",
        "WI",
        "WY",
      ],
      VideoStatus: [
        "WAITING",
        "PREPARING",
        "ASSET_CREATED",
        "READY",
        "ERRORED",
      ],
    },
  },
} as const
