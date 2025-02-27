import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');
  
  return NextResponse.json({ 
    error: error || 'An unexpected authentication error occurred',
    status: 'error'
  }, { status: 400 });
}

export async function POST() {
  return NextResponse.json({ 
    error: 'Method not allowed',
    status: 'error'
  }, { status: 405 });
} 