import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const CONFIG_FILE = path.join(process.cwd(), 'printer-settings.json');

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    // 1. Get Configured Printer
    let printerName = null;
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(data);
      printerName = config.printerName;
    } catch (e) {
      console.error("No printer config found");
    }

    if (!printerName) {
      return NextResponse.json({ error: 'No printer configured' }, { status: 400 });
    }

    // 2. Download Image
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create temp file
    const tempDir = os.tmpdir();
    const fileName = `print-${Date.now()}.jpg`; 
    const filePath = path.join(tempDir, fileName);
    
    await fs.writeFile(filePath, buffer);

    // 3. Print using PowerShell Script (Smart Scaling)
    const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'print_photo.ps1');
    const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -ImagePath "${filePath}" -PrinterName "${printerName}"`;
    
    await execAsync(command);
    
    // Cleanup temp file (delayed to allow print spooling)
    setTimeout(() => {
        fs.unlink(filePath).catch(console.error);
    }, 10000);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Print failed:', error);
    return NextResponse.json({ error: 'Print failed' }, { status: 500 });
  }
}
