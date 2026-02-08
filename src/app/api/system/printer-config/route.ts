import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'printer-settings.json');

export async function GET() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    // Return default if file doesn't exist
    return NextResponse.json({ printerName: null });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
