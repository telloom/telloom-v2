import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  return handleWebhook(request, 'POST');
}

export async function GET(request: NextRequest) {
  return handleWebhook(request, 'GET');
}

async function handleWebhook(request: NextRequest, method: string) {
  const timestamp = new Date().toISOString();
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  const logEntry = `
Timestamp: ${timestamp}
Method: ${method}
Headers: ${JSON.stringify(headers, null, 2)}
Body: ${rawBody}
---------------------
`;

  // Log to console
  console.log('Received webhook:', logEntry);

  // Log to file
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  fs.appendFileSync(path.join(logDir, 'webhook-logs.txt'), logEntry);

  return NextResponse.json({ success: true, message: 'Webhook received and logged' });
}