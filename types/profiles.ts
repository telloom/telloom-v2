/**
 * Additional profile-related types beyond those found in models.ts
 * This file contains types specifically used in the executor relationship UI components
 */

import { InvitationStatus } from './models';

export interface ProfileData {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface SharerProfile {
  id: string;
  Profile?: ProfileData;
  profile?: ProfileData;
  profileId: string;
}

/**
 * Represents an executor relationship between a sharer and an executor
 */
export interface ExecutorRelationship {
  id: string;
  sharerId: string;
  executorId?: string;
  createdAt?: string;
  sharer: SharerProfile;
}

/**
 * Represents an invitation for someone to become an executor
 */
export interface ExecutorInvitation {
  id: string;
  sharerId: string;
  executorEmail?: string;
  status?: InvitationStatus;
  createdAt?: string;
  sharer: SharerProfile;
}

/**
 * User role information including permissions and relationships
 */
export interface UserRoleInfo {
  roles: string[];
  sharerId: string | null;
  is_sharer: boolean;
  has_executor_relationship: boolean;
  executor_relationships?: ExecutorRelationship[];
  timestamp?: string;
} 