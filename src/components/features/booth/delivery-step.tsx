import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, QrCode, CheckCircle2, Share2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Step, TransactionData } from "./types";
import { mergeVideos } from "@/lib/video-utils";
import { createGif } from "@/lib/gif-utils";
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
}: DeliveryStepProps) {
  const [localQrUrl, setLocalQrUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  
  // State for email assets
  const [videoDownloadUrl, setVideoDownloadUrl] = useState<string | null>(null);
  const [gifDownloadUrl, setGifDownloadUrl] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailErrorMessage, setEmailErrorMessage] = useState<string>("");
  
  const hasPrintedRef = useRef(false);

  // Auto print when finalPreviewUrl is ready
  useEffect(() => {
    if (finalPreviewUrl && !hasPrintedRef.current) {
        hasPrintedRef.current = true;
        
        const printImage = async () => {
             // Prefer storageUrl (remote) for server-side printing
             // If not available, we can't easily server-print a blob: url
             const urlToPrint = storageUrl;

             if (urlToPrint) {
                 try {
                     const res = await fetch('/api/print', {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ url: urlToPrint })
                     });
                     if (res.ok) {
                         console.log("Printed via server");
                         return; // Success
                     }
                 } catch (e) {
                     console.error("Server print failed", e);
                 }
             }

             // Fallback to window.print() if server print fails or no URL
             console.log("Falling back to window.print()");
             window.print();
        };

        // Small delay to ensure image is ready/uploaded
        const timer = setTimeout(printImage, 1500);
        return () => clearTimeout(timer);
    }
  }, [finalPreviewUrl, storageUrl]);

  // Format session time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate GIF on mount
  useEffect(() => {
    if (capturedPhotos.length > 0 && !gifUrl && !isGeneratingGif) {
        setIsGeneratingGif(true);
        createGif(capturedPhotos)
            .then(url => {
                setGifUrl(url);
            })
            .catch(e => console.error("GIF generation failed", e))
            .finally(() => setIsGeneratingGif(false));
    }
  }, [capturedPhotos, gifUrl, isGeneratingGif]);

  // Handle auto-upload and QR code generation
  useEffect(() => {
    // 1. Set QR Code URL immediately to the download page
    if (transaction.id && !localQrUrl) {
        setLocalQrUrl(`${window.location.origin}/download/${transaction.id}`);
    }

    const uploadAssets = async () => {
        if (!supabase || !transaction.id) return;

        // 2. Upload Video if available and not yet uploaded
        if (capturedVideos.length > 0 && !videoDownloadUrl) {
            try {
                // Check if we need to merge locally
                const mergedUrl = await mergeVideos(capturedVideos); // This returns blob url
                const response = await fetch(mergedUrl);
                const blob = await response.blob();
                
                const filePath = `transactions/${transaction.id}/video.webm`;
                const { error } = await supabase.storage.from("captures").upload(filePath, blob, { contentType: "video/webm", upsert: true });
                
                if (!error) {
                    const { data } = await supabase.storage.from("captures").createSignedUrl(filePath, 3600 * 24 * 7); // 1 week
                    if (data?.signedUrl) {
                        setVideoDownloadUrl(data.signedUrl);
                    }
                }
            } catch (e) {
                console.error("Background video merge/upload failed", e);
            }
        }

        // 3. Upload GIF if available and not yet uploaded
        // We check gifUrl (which comes from createGif effect) or generate it JIT
        if (capturedPhotos.length > 0 && !gifDownloadUrl) {
             try {
                let currentGifUrl = gifUrl;
                
                // If gifUrl not ready yet, try to generate it now
                if (!currentGifUrl) {
                   try {
                     currentGifUrl = await createGif(capturedPhotos);
                     setGifUrl(currentGifUrl);
                   } catch (err) {
                     console.error("JIT GIF generation failed", err);
                   }
                }

                if (currentGifUrl) {
                    const response = await fetch(currentGifUrl);
                    const blob = await response.blob();
                    
                    const filePath = `transactions/${transaction.id}/animation.gif`;
                    const { error } = await supabase.storage.from("captures").upload(filePath, blob, { contentType: "image/gif", upsert: true });
                    
                    if (!error) {
                        const { data } = await supabase.storage.from("captures").createSignedUrl(filePath, 3600 * 24 * 7); // 1 week
                        if (data?.signedUrl) {
                            setGifDownloadUrl(data.signedUrl);
                        }
                    }
                }
             } catch (e) {
                 console.error("GIF upload failed", e);
             }
        }
    };
    
    uploadAssets();

  }, [capturedVideos, capturedPhotos, localQrUrl, gifUrl, supabase, transaction.id, videoDownloadUrl, gifDownloadUrl]);


  const handleSendEmail = async () => {
    if (!transaction.email || !storageUrl) return;

    setIsSendingEmail(true);
    setEmailStatus('idle');
    setEmailErrorMessage("");

    try {
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
            throw new Error(result.error || 'Failed to send email');
        }

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
                        aspectRatio: "3/4", // Assuming standard photo strip/print ratio, adjust if needed based on actual image
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
          </div>

      </div>
    </motion.div>
  );
}
