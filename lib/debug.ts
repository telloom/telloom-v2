/**
 * Debug logging utility
 * 
 * This provides a consistent way to handle debug logs across the application.
 * In production, these logs can be controlled via an environment variable.
 */

// Enable/disable debug logging with an environment variable
const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_ENABLED === 'true';

/**
 * Log debug messages, but only when debug mode is enabled
 */
export function debugLog(message: string, data?: any): void {
  if (DEBUG_ENABLED) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
}

/**
 * Log debug errors, but only when debug mode is enabled
 */
export function debugError(message: string, error?: any): void {
  if (DEBUG_ENABLED) {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }
}

/**
 * Log debug warnings, but only when debug mode is enabled
 */
export function debugWarn(message: string, data?: any): void {
  if (DEBUG_ENABLED) {
    if (data) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  }
} 