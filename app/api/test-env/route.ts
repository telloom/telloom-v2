import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    MUX_ACCESS_TOKEN_ID: process.env.MUX_ACCESS_TOKEN_ID ? 'Set' : 'Not set',
    MUX_SECRET_KEY: process.env.MUX_SECRET_KEY ? 'Set' : 'Not set',
    NODE_ENV: process.env.NODE_ENV,
  });
}