import { NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use a 'uploads' directory in the project root (outside src to avoid reloads)
    const uploadDir = join(process.cwd(), "uploads");
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Sanitize filename to prevent directory traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}-${safeName}`;
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // Return the URL that will be handled by the GET handler of this same route
    // We'll use a query param ?file=filename
    return NextResponse.json({ 
      url: `/api/local-storage?file=${filename}`,
      filename: filename
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("file");

  if (!filename) {
    return NextResponse.json({ error: "File parameter missing" }, { status: 400 });
  }

  const uploadDir = join(process.cwd(), "uploads");
  const filepath = join(uploadDir, filename);

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filepath);
    
    // Determine content type
    let contentType = "application/octet-stream";
    if (filename.endsWith(".png")) contentType = "image/png";
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) contentType = "image/jpeg";
    if (filename.endsWith(".webm")) contentType = "video/webm";
    if (filename.endsWith(".html")) contentType = "text/html";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Read error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
