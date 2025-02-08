/**
 * File: utils/loops.ts
 * Description: Loops email client configuration and helper functions
 */

import { LoopsClient } from 'loops';

// Initialize Loops client
const loops = new LoopsClient(process.env.LOOPS_API_KEY!);

export const TRANSACTIONAL_EMAIL_IDS = {
  INVITATION: process.env.LOOPS_INVITATION_TEMPLATE_ID!,
  FOLLOW_REQUEST: process.env.LOOPS_FOLLOW_REQUEST_TEMPLATE_ID!,
} as const;

export { loops }; 