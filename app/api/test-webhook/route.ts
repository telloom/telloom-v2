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
  console.log('Webhook handler started');
  try {
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
    console.log('Log directory path:', logDir);
    
    if (!fs.existsSync(logDir)) {
      console.log('Creating log directory');
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logPath = path.join(logDir, 'webhook-logs.txt');
    console.log('Log file path:', logPath);
    
    fs.appendFileSync(logPath, logEntry);
    console.log('Log entry appended to file');

    return NextResponse.json({ success: true, message: 'Webhook received and logged' });
  } catch (error) {
    console.error('Error in handleWebhook:', error);
    return NextResponse.json({ success: false, message: 'Error processing webhook' }, { status: 500 });
  }
}