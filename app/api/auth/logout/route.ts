// app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  response.cookies.delete('supabase-access-token');
  response.cookies.delete('supabase-refresh-token');

  return response;
}