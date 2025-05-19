// utils/formatting.ts
// This file contains utility functions for formatting text and strings.

/**
 * Formats a topic name for the Listener's perspective.
 * If the topicName starts with "Your ", it replaces it with "Their ".
 * @param topicName The original topic name.
 * @returns The formatted topic name for the Listener, or an empty string if input is not a string.
 */
export function formatTopicNameForListener(topicName: string | null | undefined): string {
  if (typeof topicName !== 'string') {
    return ''; // Return empty string for non-string inputs
  }
  if (topicName.startsWith('Your ')) {
    return 'Their ' + topicName.substring(5);
  }
  return topicName;
} 