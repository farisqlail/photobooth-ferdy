import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const command =
      'powershell -ExecutionPolicy Bypass -Command "Start-Process \\"C:\\\\Program Files\\\\Common Files\\\\microsoft shared\\\\ink\\\\TabTip.exe\\""';
    await execAsync(command);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to show touch keyboard:", error);
    return NextResponse.json(
      { error: "Failed to show keyboard" },
      { status: 500 }
    );
  }
}

