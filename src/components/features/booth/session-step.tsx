import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { motion } from "framer-motion";
import { Step, TemplateOption } from "./types";
import { RefObject } from "react";

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
}: SessionStepProps) {
  const isRetakeMode = retakeIndex !== null && retakeIndex !== undefined;

  return (
    <motion.section
      key="session"
      className="flex min-h-[calc(100vh-14rem)] flex-col gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      {/* Top Counter */}
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="text-xl font-medium">
          {capturedPhotos.length} / {selectedTemplate?.slots_config?.length || 3}
        </span>
      </div>

      <div className="flex flex-1 gap-6">
        {/* Left: Main Camera */}
        <div className="relative flex-1 overflow-hidden rounded-3xl border border-border bg-black shadow-sm">
          <video
            ref={onPreviewVideoMount}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
          />
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-9xl font-bold text-white z-30">
              {countdown}
            </div>
          )}
        </div>

        {/* Right: Sidebar Thumbnails */}
        <div className="flex w-32 flex-col gap-4 overflow-y-auto lg:w-48">
          {Array.from({ length: selectedTemplate?.slots_config?.length || 3 }).map(
            (_, index) => (
              <div
                key={index}
                className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 transition-all ${
                  capturedPhotos[index]
                    ? "border-primary shadow-md"
                    : "border-muted bg-muted/20"
                } ${retakeIndex === index ? "ring-4 ring-yellow-500 border-yellow-500" : ""}`}
              >
                {capturedPhotos[index] ? (
                  <Image
                    src={capturedPhotos[index]}
                    alt={`Shot ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-4 py-4">
        {isRetakeMode ? (
          <>
            <Button
              variant="ghost"
              onClick={onCancelRetake}
              disabled={isCapturing}
            >
              Batal
            </Button>
            <Button
              size="lg"
              className="h-14 rounded-full px-12 text-lg shadow-sm"
              onClick={startPhotoSession}
              disabled={isCapturing}
            >
              <Camera className="mr-2 h-6 w-6" />
              {isCapturing ? "Mengambil Foto..." : `Ambil Ulang Foto ${retakeIndex! + 1}`}
            </Button>
          </>
        ) : capturedPhotos.length > 0 && !isCapturing ? (
          <>
            <Button
              variant="destructive"
              size="lg"
              className="h-14 rounded-full px-8 text-lg shadow-sm"
              onClick={startPhotoSession}
              disabled={isCapturing}
            >
              Ulangi Sesi
            </Button>
            <Button
              variant="default"
              size="lg"
              className="h-14 rounded-full px-12 text-lg shadow-sm"
              onClick={() => onGoToStep("filter")}
            >
              Selesai
            </Button>
          </>
        ) : (
          <>
            {!isCapturing && (
              <Button variant="ghost" onClick={() => onGoToStep("quantity")}>
                Kembali
              </Button>
            )}
            <Button
              size="lg"
              className="h-14 rounded-full px-12 text-lg shadow-sm"
              onClick={startPhotoSession}
              disabled={isCapturing}
            >
              <Camera className="mr-2 h-6 w-6" />
              {isCapturing ? "Mengambil Foto..." : "Mulai Sesi Foto"}
            </Button>
          </>
        )}
      </div>
    </motion.section>
  );
}
