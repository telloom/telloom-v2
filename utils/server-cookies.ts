'use server';

import { cookies, headers } from 'next/headers';

export async function getServerCookie(name: string): Promise<string | undefined> {
  try {
    console.log(`[SERVER_COOKIE] Getting cookie: ${name}`);
    const cookie = cookies().get(name);
    console.log(`[SERVER_COOKIE] Cookie ${name}: ${cookie ? 'found' : 'not found'}`);
    return cookie?.value;
  } catch (error) {
    console.error(`[SERVER_COOKIE] Error getting cookie ${name}:`, error);
    return undefined;
  }
}

export async function getAllServerCookies() {
  try {
    console.log('[SERVER_COOKIE] Getting all cookies');
    const allCookies = cookies().getAll();
    console.log(`[SERVER_COOKIE] Found ${allCookies.length} cookies`);
    
    // Only log cookie names for security
    const cookieNames = allCookies.map(c => c.name);
    console.log('[SERVER_COOKIE] Cookie names:', cookieNames);
    
    return allCookies;
  } catch (error) {
    console.error('[SERVER_COOKIE] Error getting all cookies:', error);
    return [];
  }
}

export async function setServerCookie(
  name: string,
  value: string,
  options?: {
    expires?: Date;
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }
) {
  try {
    console.log(`[SERVER_COOKIE] Setting cookie: ${name}`);
    cookies().set({
      name,
      value,
      ...options
    });
    console.log(`[SERVER_COOKIE] Cookie ${name} set successfully`);
  } catch (error) {
    console.error(`[SERVER_COOKIE] Error setting cookie ${name}:`, error);
  }
}

export async function deleteServerCookie(
  name: string,
  options?: {
    path?: string;
    domain?: string;
  }
) {
  try {
    console.log(`[SERVER_COOKIE] Deleting cookie: ${name}`);
    cookies().set({
      name,
      value: '',
      expires: new Date(0),
      ...options
    });
    console.log(`[SERVER_COOKIE] Cookie ${name} deleted successfully`);
  } catch (error) {
    console.error(`[SERVER_COOKIE] Error deleting cookie ${name}:`, error);
  }
} 