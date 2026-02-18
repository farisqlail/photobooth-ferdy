import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const command =
      'powershell -ExecutionPolicy Bypass -Command "Get-Process TabTip -ErrorAction SilentlyContinue | Stop-Process"';
    await execAsync(command);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to hide touch keyboard:", error);
    return NextResponse.json(
      { error: "Failed to hide keyboard" },
      { status: 500 }
    );
  }
}

