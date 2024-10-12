// app/auth/error/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Perform any server-side logic here if needed
  // For example, you might log the error or handle specific query parameters

  // Extract the error message from query parameters if needed
  const { searchParams } = new URL(request.url);
  const errorMessage = searchParams.get('error');

  // Optionally, you can process the error message or perform additional logic

  // Return the error page
  return NextResponse.rewrite(new URL('/auth/error', request.url));
}