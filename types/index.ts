// index.ts
/**
 * Re-exports all types from the individual type files for easier imports.
 * Instead of importing types from specific files, you can import them directly
 * from the 'types' folder.
 * 
 * As you add new type files, make sure to export them here to maintain centralized access.
 */

export * from './api';
export * from './auth';
export * from './context';
export * from './events';
export * from './models';
export * from './utils';
export * from './supabase';
