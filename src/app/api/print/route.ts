import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { PDFDocument } from "pdf-lib";
 
const CONFIG_FILE = path.join(process.cwd(), "printer-settings.json");
 
export async function POST(request: Request) {
  try {
    const { url } = await request.json();
 
    let printerName: string | null = null;
    try {
      const data = await fs.readFile(CONFIG_FILE, "utf-8");
      const config = JSON.parse(data);
      printerName = config.printerName;
    } catch (e) {
      console.error("No printer config found");
    }
 
    if (!printerName) {
      return NextResponse.json(
        { error: "No printer configured" },
        { status: 400 }
      );
    }
 
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
 
    const pdfDoc = await PDFDocument.create();
    const pageWidth = 4 * 72;
    const pageHeight = 6 * 72;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
 
    const jpgImage = await pdfDoc.embedJpg(imageBuffer);
    const imgWidth = jpgImage.width;
    const imgHeight = jpgImage.height;
 
    const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;
 
    page.drawImage(jpgImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
 
    const pdfBytes = await pdfDoc.save();
 
    const tempDir = os.tmpdir();
    const fileName = `print-${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, pdfBytes);
 
    const printerModule = await import("pdf-to-printer");
    const print = (printerModule as any).print;
 
    await print(filePath, {
      printer: printerName,
    });
 
    setTimeout(() => {
      fs.unlink(filePath).catch(console.error);
    }, 10000);
 
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Print failed:", error);
    return NextResponse.json({ error: "Print failed" }, { status: 500 });
  }
}
