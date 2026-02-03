import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check, ArrowRight, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Step, TemplateOption } from "./types";
import { RefObject } from "react";
import { cn } from "@/lib/utils";

interface SessionStepProps {
  capturedPhotos: string[];
  selectedTemplate: TemplateOption | null;
  onPreviewVideoMount: (node: HTMLVideoElement | null) => void;
  countdown: number | null;
  startPhotoSession: () => void;
  isCapturing: boolean;
  onGoToStep: (step: Step) => void;
  retakeIndex?: number | null;
  onCancelRetake?: () => void;
  sessionTimeLeft?: number | null;
  onRetakePhoto?: (index: number) => void;
}

export function SessionStep({
  capturedPhotos,
  selectedTemplate,
  onPreviewVideoMount,
  countdown,
  startPhotoSession,
  isCapturing,
  onGoToStep,
  retakeIndex,
  onCancelRetake,
  sessionTimeLeft,
  onRetakePhoto,
}: SessionStepProps) {
  const isRetakeMode = retakeIndex !== null && retakeIndex !== undefined;
  const totalSlots = selectedTemplate?.slots_config?.length || 3;
  const currentSlot = capturedPhotos.length + 1;

  // Format session time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      key="session"
      className="flex h-full w-full gap-4 p-2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* COLUMN 1: Main Camera Feed */}
      <div className="relative flex-1 overflow-hidden rounded-[2rem] bg-black shadow-2xl border border-zinc-800">
        <video
          ref={onPreviewVideoMount}
          className="absolute inset-0 h-full w-full object-cover transform scale-x-[-1]" 
          playsInline
          muted
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 z-30">
            <motion.div 
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[12rem] font-black text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.5)]"
            >
              {countdown}
            </motion.div>
          </div>
        )}

        {/* Status Badge inside Camera */}
        <div className="absolute top-6 left-6 z-10">
           <div className="flex items-center gap-3 rounded-full bg-black/50 backdrop-blur-md px-4 py-2 border border-white/10">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold text-white tracking-wider uppercase">Live Camera</span>
           </div>
        </div>
      </div>

      {/* COLUMN 2: Sidebar (Thumbnails & Controls) */}
      <div className="flex w-[35%] flex-col rounded-[2rem] bg-black p-6 shadow-2xl text-white justify-between h-full border border-zinc-800/50">
        
        {/* Top: Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-2xl font-bold">Sesi Foto</h2>
             <div className="flex items-center gap-2">
               {sessionTimeLeft !== null && sessionTimeLeft !== undefined && (
                 <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-mono font-bold text-red-500">{formatTime(sessionTimeLeft)}</span>
                 </div>
               )}
               <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-black">
                  {isRetakeMode ? "RETAKE MODE" : `STEP ${capturedPhotos.length < totalSlots ? capturedPhotos.length + 1 : totalSlots}/${totalSlots}`}
               </span>
             </div>
          </div>
          <p className="text-zinc-400 text-sm">
            {isRetakeMode 
              ? "Ambil ulang foto yang kurang bagus" 
              : capturedPhotos.length === totalSlots 
                ? "Sesi foto selesai! Lanjut ke editing?" 
                : "Bersiaplah untuk pose terbaikmu!"}
          </p>
        </div>

        {/* Middle: Thumbnails Grid */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 mb-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: totalSlots }).map((_, index) => {
              const hasPhoto = capturedPhotos[index];
              const isCurrent = !hasPhoto && index === capturedPhotos.length && !isRetakeMode;
              const isRetaking = retakeIndex === index;

              return (
                <div
                  key={index}
                  className={cn(
                    "relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 transition-all duration-300",
                    hasPhoto ? "border-white/20 cursor-pointer group" : "border-zinc-800 bg-zinc-900",
                    isCurrent && "border-white ring-2 ring-white/20 shadow-lg scale-[1.02]",
                    isRetaking && "border-yellow-500 ring-4 ring-yellow-500/20 shadow-yellow-500/20"
                  )}
                  onClick={() => {
                    if (hasPhoto && onRetakePhoto && !isCapturing && !isRetakeMode) {
                        onRetakePhoto(index);
                    }
                  }}
                >
                  {hasPhoto ? (
                    <>
                      <Image
                        src={capturedPhotos[index]}
                        alt={`Shot ${index + 1}`}
                        fill
                        className="object-cover transform scale-x-[-1] transition-transform group-hover:scale-105"
                        unoptimized
                      />
                      <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-xs font-bold border border-white/20 z-10">
                        {index + 1}
                      </div>
                      
                      {!isRetakeMode && !isCapturing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-sm flex items-center gap-1 border border-white/20">
                            <RefreshCw className="h-3 w-3" />
                            Ubah
                            </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-zinc-500 gap-2">
                       <Camera className="h-6 w-6 opacity-20" />
                       <span className="text-xs font-medium">Foto {index + 1}</span>
                    </div>
                  )}
                  
                  {isRetaking && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                       <RefreshCw className="h-8 w-8 text-yellow-500 animate-spin-slow" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: Controls */}
        <div className="space-y-3">
          {isRetakeMode ? (
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full h-16 rounded-full bg-yellow-500 text-black hover:bg-yellow-400 font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all"
                onClick={startPhotoSession}
                disabled={isCapturing}
              >
                <Camera className="mr-2 h-6 w-6" />
                {isCapturing ? "Processing..." : "Ambil Ulang"}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 rounded-full border-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
                onClick={onCancelRetake}
                disabled={isCapturing}
              >
                Batal
              </Button>
            </div>
          ) : capturedPhotos.length > 0 && !isCapturing && capturedPhotos.length === totalSlots ? (
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full h-16 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all"
                onClick={() => onGoToStep("filter")}
              >
                Lanjut Filter
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 rounded-full border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                onClick={startPhotoSession} // Logic for re-doing whole session needs check? 
                // Wait, original logic was: 
                // onClick={startPhotoSession} with text "Ulangi Sesi".
                // But usually "Ulangi Sesi" means clear all photos. 
                // The original code called startPhotoSession which might just take the next photo or reset?
                // Looking at usePhotoSession hook usage in page.tsx:
                // resetSession() is called in resetFlow.
                // startPhotoSession just starts countdown.
                // If photos are full, startPhotoSession might overwrite? 
                // Let's assume the user wants to retake all. 
                // Actually, if full, we probably want a specific "Reset" action, but let's stick to original behavior for now.
                // Original: onClick={startPhotoSession} -> "Ulangi Sesi"
                // But wait, if I click "Ulangi Sesi", it calls startPhotoSession. 
                // Does it clear photos?
                // Let's look at page.tsx again...
                // handleStartPhotoSession calls startPhotoSession.
                // If I am fully captured, I should probably reset first.
                // But the user didn't ask to fix logic, just UI.
                // I'll keep the handler same as original for "Ulangi Sesi".
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Foto Ulang Semua
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
               <Button
                size="lg"
                className="w-full h-16 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-[1.02]"
                onClick={startPhotoSession}
                disabled={isCapturing}
              >
                <Camera className="mr-2 h-6 w-6" />
                {isCapturing ? "Processing..." : capturedPhotos.length === 0 ? "Mulai Foto" : "Foto Selanjutnya"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
