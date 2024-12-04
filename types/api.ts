// api.ts
/**
 * Contains TypeScript interfaces and types for API request and response payloads.
 * It defines the structure of data sent to and received from the server, including
 * authentication, video uploads, and prompt responses.
 * 
 * As the app evolves, expand this file by adding new interfaces for additional API endpoints
 * and updating existing ones to reflect changes in the server API.
 */

import { Profile } from '@/types/models';

export interface ActionState {
  status: 'success' | 'error';
  message: string;
  data?: any;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  profile: Profile;
}

export interface SignUpRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface SignUpResponse {
  message: string;
}

export interface PromptResponsePayload {
  promptId: string;
  responseText?: string;
  videoFile?: File;
  attachments?: File[];
}

export interface VideoUploadResponse {
  muxUploadUrl: string;
  videoId: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}

export interface InsertVideo {
  uploadId: string;
  status: string;
}