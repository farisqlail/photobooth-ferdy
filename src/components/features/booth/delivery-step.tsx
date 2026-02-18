import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, QrCode, CheckCircle2, Share2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Step, TransactionData } from "./types";
import { SupabaseClient } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

interface DeliveryStepProps {
  finalPreviewUrl: string | null;
  storageUrl: string | null;
  transaction: TransactionData;
  onSetEmail: (email: string) => void;
  onGoToStep: (step: Step) => void;
  isUploading: boolean;
  capturedPhotos?: string[];
  capturedVideos?: string[];
  supabase: SupabaseClient | null;
  sessionTimeLeft?: number | null;
  gifDownloadUrl: string | null;
  videoDownloadUrl: string | null;
  gifUploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  videoUploadStatus: 'idle' | 'uploading' | 'success' | 'error';
}

export function DeliveryStep({
  finalPreviewUrl,
  storageUrl,
  transaction,
  onSetEmail,
  onGoToStep,
  isUploading,
  capturedPhotos = [],
  capturedVideos = [],
  supabase,
  sessionTimeLeft,
  gifDownloadUrl,
  videoDownloadUrl,
  gifUploadStatus,
  videoUploadStatus,
}: DeliveryStepProps) {
  const [localQrUrl, setLocalQrUrl] = useState<string | null>(null);
  
  // State for email assets
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailErrorMessage, setEmailErrorMessage] = useState<string>("");
  
  const hasPrintedRef = useRef(false);

  // Auto print when storageUrl is ready (silent via server-side print only)
  useEffect(() => {
    if (storageUrl && !hasPrintedRef.current) {
      hasPrintedRef.current = true;

      const printImage = async () => {
        console.log("Attempting server print...");

        try {
          const res = await fetch("/api/print", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: storageUrl }),
          });

          if (res.ok) {
            console.log("Printed via server");
            return;
          }

          const errorText = await res.text();
          console.error("Server print returned non-OK status", res.status, errorText);
        } catch (e) {
          console.error("Server print failed", e);
        }
      };

      printImage();
    }
  }, [storageUrl]);

  // Format session time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle QR code generation
  useEffect(() => {
    // 1. Set QR Code URL immediately to the download page
    if (transaction.id && !localQrUrl) {
        setLocalQrUrl(`${window.location.origin}/download/${transaction.id}`);
    }
  }, [transaction.id, localQrUrl]);

  const handleSendEmail = async () => {
    if (!transaction.email) {
        setEmailStatus('error');
        setEmailErrorMessage("Mohon isi alamat email.");
        return;
    }
    
    if (!storageUrl) {
        setEmailStatus('error');
        setEmailErrorMessage("Foto belum siap diunggah. Mohon tunggu sebentar.");
        return;
    }

    // Block email sending ONLY if GIF is currently uploading
    if (capturedPhotos.length > 0 && gifUploadStatus === 'uploading') {
         setEmailStatus('error');
         setEmailErrorMessage("Sedang menyiapkan animasi GIF. Mohon tunggu beberapa detik lagi.");
         return;
    }

    // Block email sending ONLY if Video is currently uploading
    if (capturedVideos.length > 0 && videoUploadStatus === 'uploading') {
         setEmailStatus('error');
         setEmailErrorMessage("Sedang menyiapkan Live Video. Mohon tunggu beberapa detik lagi.");
         return;
    }

    setIsSendingEmail(true);
    setEmailStatus('idle');
    setEmailErrorMessage("");

    try {
        console.log("Sending email to:", transaction.email, "URL:", storageUrl);
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: transaction.email,
                photoUrl: storageUrl,
                videoUrl: videoDownloadUrl,
                gifUrl: gifDownloadUrl,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Email API Error:", result);
            throw new Error(result.error || 'Failed to send email');
        }

        console.log("Email sent successfully:", result);
        setEmailStatus('success');
    } catch (error) {
        console.error("Failed to send email", error);
        setEmailStatus('error');
        if (error instanceof Error) {
           setEmailErrorMessage(error.message);
        } else {
           setEmailErrorMessage("Gagal mengirim email.");
        }
    } finally {
        setIsSendingEmail(false);
    }
  };

  const handlePreviewPrint = () => {
    if (!finalPreviewUrl) return;

    const escapedSrc = finalPreviewUrl
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Preview 4R</title>
          <style>
            @page {
              size: 4in 6in;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              background: #ffffff;
            }
            body {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${escapedSrc}" alt="Preview 4R" />
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      window.location.href = url;
    }
  };

  return (
    <motion.div
      key="delivery"
      className="flex h-full w-full gap-4 p-2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* COLUMN 1: Preview */}
      <div className="relative flex-1 w-full overflow-hidden rounded-[2rem] bg-zinc-900/50 p-8 shadow-xl border border-zinc-800 flex items-center justify-center backdrop-blur-sm">
          {finalPreviewUrl ? (
             <div className="relative h-full w-full flex items-center justify-center">
                <div 
                    className="print-area"
                    style={{
                        position: "relative",
                        height: "100%",
                        width: "auto",
                        aspectRatio: "2/3",
                        boxShadow: "0 0 50px -12px rgba(0, 0, 0, 0.5)"
                    }}
                >
                    <Image
                      src={finalPreviewUrl}
                      alt="Final"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                </div>
             </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium">Memproses hasil foto...</p>
            </div>
          )}
      </div>

      {/* COLUMN 2: Controls Sidebar */}
      <div className="flex w-[35%] flex-col rounded-[2rem] bg-black p-6 shadow-2xl text-white justify-between h-full border border-zinc-800/50">
          
          {/* Top: Header */}
          <div>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold">Ambil Foto</h2>
                </div>
                
                {sessionTimeLeft !== null && sessionTimeLeft !== undefined && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm font-mono font-bold text-red-500">{formatTime(sessionTimeLeft)}</span>
                    </div>
                )}
            </div>
            <p className="text-zinc-400 text-sm mb-6">
                Scan QR code untuk mengunduh softcopy, atau kirim via email.
            </p>
          </div>

          {/* Middle: Content */}
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 mb-6 custom-scrollbar space-y-6">
              
              {/* QR Code Section */}
              <div className="rounded-2xl bg-zinc-900/50 p-4 border border-zinc-800 flex flex-col items-center gap-3">
                   <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider w-full">
                      <QrCode className="h-3 w-3" />
                      Scan untuk Download
                   </div>
                   
                   <div className="p-2 bg-white rounded-xl">
                        {localQrUrl ? (
                            <QRCodeCanvas value={localQrUrl} size={150} />
                        ) : (
                            <div className="h-[150px] w-[150px] flex items-center justify-center bg-zinc-100 rounded-lg">
                                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                            </div>
                        )}
                   </div>
                   
                   {isUploading && (
                       <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                           <Loader2 className="h-3 w-3 animate-spin" />
                           Mengunggah cloud...
                       </span>
                   )}
              </div>

              {/* Email Section */}
              <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      <Mail className="h-3 w-3" />
                      Kirim via Email
                   </div>
                   <div className="flex gap-2">
                        <Input
                            placeholder="Email kamu..."
                            value={transaction.email ?? ""}
                            onChange={(event) => onSetEmail(event.target.value)}
                            className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-white/20 rounded-xl h-11"
                        />
                        <Button 
                            onClick={handleSendEmail} 
                            disabled={isSendingEmail || !transaction.email}
                            size="icon"
                            className="h-11 w-11 shrink-0 rounded-xl bg-white text-black hover:bg-zinc-200"
                        >
                            {isSendingEmail ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Share2 className="h-4 w-4" />
                            )}
                        </Button>
                   </div>
                   {emailStatus === 'success' && (
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Email terkirim!
                        </p>
                    )}
                    {emailStatus === 'error' && (
                        <p className="text-xs text-red-500">{emailErrorMessage}</p>
                    )}
              </div>

          </div>

          {/* Bottom: Action Buttons */}
          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-zinc-900">
            <Button
              size="lg"
              className="w-full h-14 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-[1.02]"
              onClick={() => onGoToStep("finish")}
            >
              Selesai
            </Button>
            {/* <Button
              variant="outline"
              className="w-full h-10 rounded-full border-zinc-700 text-zinc-200 hover:bg-zinc-900 hover:text-white text-sm"
              onClick={handlePreviewPrint}
              disabled={!finalPreviewUrl}
            >
              Preview 4R di Tab Baru
            </Button> */}
          </div>

      </div>
    </motion.div>
  );
}
