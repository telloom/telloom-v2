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
  PASSWORD_RESET: process.env.LOOPS_PASSWORD_RESET_TEMPLATE_ID!,
} as const;

/**
 * Sends a password reset email to the specified email address
 * @param email The recipient's email address
 * @param resetLink The password reset link (base URL)
 * @param tokenHash Optional token hash from Supabase
 */
export async function sendPasswordResetEmail(
  email: string, 
  resetLink: string,
  tokenHash?: string
) {
  try {
    console.log('[LOOPS] Sending password reset email to:', email.substring(0, 3) + '...');
    
    // For PKCE flow, we need to ensure the reset link includes the token_hash and type parameters
    // If we have a token hash from Supabase, construct a reset link that matches Supabase's format
    let finalResetLink = resetLink;
    
    if (tokenHash) {
      // Create a URL object to properly handle parameter addition
      const resetUrl = new URL(resetLink);
      resetUrl.searchParams.set('token_hash', tokenHash);
      resetUrl.searchParams.set('type', 'recovery');
      finalResetLink = resetUrl.toString();
      
      console.log('[LOOPS] Using token_hash format for reset link');
    } else {
      console.log('[LOOPS] Using default reset link format (no token_hash)');
    }

    await loops.sendTransactionalEmail({
      transactionalId: TRANSACTIONAL_EMAIL_IDS.PASSWORD_RESET,
      email,
      dataVariables: {
        resetLink: finalResetLink,
      },
    });
    
    console.log('[LOOPS] Password reset email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('[LOOPS] Error sending password reset email:', error);
    return { success: false, error };
  }
}

export { loops }; 