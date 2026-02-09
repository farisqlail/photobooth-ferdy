import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout } = await execAsync('powershell "Get-Printer | Select-Object Name | ConvertTo-Json"');
    const printers = JSON.parse(stdout);
    // Handle single object vs array
    const printerList = Array.isArray(printers) ? printers : [printers];
    return NextResponse.json(printerList);
  } catch (error) {
    console.error('Failed to list printers:', error);
    return NextResponse.json({ error: 'Failed to list printers' }, { status: 500 });
  }
}
