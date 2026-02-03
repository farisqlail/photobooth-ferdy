import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, RefreshCw, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { Step, TemplateOption } from "./types";
import { filters } from "./constants";
import { getSlotPercentages } from "./utils";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface FilterStepProps {
  capturedPhotos: string[];
  selectedTemplate: TemplateOption | null;
  templateImage: HTMLImageElement | null;
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
  onGoToStep: (step: Step) => void;
  onGenerateFinalImage: () => void;
  onRetakePhoto: (index: number) => void;
  sessionTimeLeft?: number | null;
  isProcessing?: boolean;
}

export function FilterStep({
  capturedPhotos,
  selectedTemplate,
  templateImage,
  selectedFilter,
  onSelectFilter,
  onGoToStep,
  onGenerateFinalImage,
  onRetakePhoto,
  sessionTimeLeft,
  isProcessing = false,
}: FilterStepProps) {
  const [retakeConfirmationIndex, setRetakeConfirmationIndex] = useState<number | null>(null);

  // Format session time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      key="filter"
      className="flex h-full w-full gap-4 p-2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* COLUMN 1: Preview */}
      <div
        className="relative flex-1 w-full overflow-hidden rounded-[2rem] bg-zinc-900/50 p-8 shadow-xl border border-zinc-800 flex items-center justify-center backdrop-blur-sm"
      >
        {templateImage && selectedTemplate ? (
          <div
            className="relative h-full w-full flex items-center justify-center"
          >
            <div 
                style={{
                    position: "relative",
                    aspectRatio: `${templateImage.naturalWidth} / ${templateImage.naturalHeight}`,
                    height: "100%",
                    width: "auto",
                    boxShadow: "0 0 50px -12px rgba(0, 0, 0, 0.5)"
                }}
            >
                {/* Photos (Behind Template) */}
                {capturedPhotos.map((photo, index) => {
                let slot = selectedTemplate.slots_config?.[index];
                if (
                    !slot &&
                    index === 0 &&
                    selectedTemplate.photo_x !== undefined
                ) {
                    slot = {
                    id: "legacy",
                    x: selectedTemplate.photo_x ?? 0,
                    y: selectedTemplate.photo_y ?? 0,
                    width: selectedTemplate.photo_width ?? 0,
                    height: selectedTemplate.photo_height ?? 0,
                    };
                }
                if (!slot) return null;

                const { x, y, width, height } = getSlotPercentages(
                    slot,
                    templateImage.naturalWidth,
                    templateImage.naturalHeight
                );

                return (
                    <div
                    key={index}
                    className="absolute overflow-hidden cursor-pointer group"
                    style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        zIndex: 0,
                    }}
                    onClick={() => setRetakeConfirmationIndex(index)}
                    >
                    <Image
                        src={photo}
                        alt="captured"
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        style={{ filter: selectedFilter }}
                        unoptimized
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-sm flex items-center gap-1 border border-white/20">
                           <RefreshCw className="h-3 w-3" />
                           Ubah
                        </span>
                    </div>
                    </div>
                );
                })}

                {/* Template Overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                <Image
                    src={selectedTemplate.url}
                    alt={selectedTemplate.name}
                    fill
                    className="object-contain"
                    unoptimized
                />
                </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Memproses foto...</p>
          </div>
        )}
      </div>

      {/* COLUMN 2: Controls Sidebar */}
      <div className="flex w-[35%] flex-col rounded-[2rem] bg-black p-6 shadow-2xl text-white justify-between h-full border border-zinc-800/50">
        
        {/* Top: Header */}
        <div className="mb-6">
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                    <Wand2 className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">Edit Foto</h2>
              </div>
              
              {sessionTimeLeft !== null && sessionTimeLeft !== undefined && (
                 <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-mono font-bold text-red-500">{formatTime(sessionTimeLeft)}</span>
                 </div>
               )}
           </div>
           <p className="text-zinc-400 text-sm">
             Pilih filter estetik untuk menyempurnakan hasil fotomu. Klik foto di preview untuk foto ulang.
           </p>
        </div>

        {/* Middle: Filter Grid */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 mb-6 custom-scrollbar">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Pilih Filter</h3>
          <div className="grid grid-cols-2 gap-4">
            {filters.map((filter) => {
              const isSelected = selectedFilter === filter.value;
              return (
                <button
                    key={filter.id}
                    className={cn(
                        "group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all duration-300",
                        isSelected 
                        ? "border-white ring-2 ring-white/20 shadow-xl scale-[1.02] z-10" 
                        : "border-zinc-800 hover:border-zinc-600 hover:scale-[1.01] opacity-80 hover:opacity-100"
                    )}
                    onClick={() => onSelectFilter(filter.value)}
                >
                    {capturedPhotos[0] && (
                    <Image
                        src={capturedPhotos[0]}
                        alt={filter.label}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        style={{ filter: filter.value }}
                    />
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity",
                        isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                    )} />

                    {/* Label */}
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                        <span className={cn(
                            "text-sm font-bold text-white shadow-sm",
                            isSelected && "text-white"
                        )}>
                            {filter.label}
                        </span>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                    </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom: Action Buttons */}
        <div className="flex flex-col gap-3 mt-auto">
          <Button
            size="lg"
            className="w-full h-16 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-[1.02]"
            onClick={onGenerateFinalImage}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Cetak Foto
                <ArrowRight className="ml-2 h-6 w-6" />
              </>
            )}
          </Button>
          
          <Button
            variant="ghost"
            className="w-full h-12 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-900"
            onClick={() => onGoToStep("session")}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Ulangi Sesi
          </Button>
        </div>
      </div>

      <Dialog
        open={retakeConfirmationIndex !== null}
        onOpenChange={(open) => !open && setRetakeConfirmationIndex(null)}
      >
        <DialogContent className="sm:max-w-md rounded-[2rem] border-zinc-800 bg-zinc-900 text-white p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Foto Ulang?</DialogTitle>
            <DialogDescription className="text-zinc-400 text-base">
              Apakah kamu yakin ingin mengambil ulang foto di posisi ini? Foto lama akan terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex-row gap-3 sm:justify-between">
            <Button
              variant="outline"
              className="flex-1 rounded-full border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white h-12"
              onClick={() => setRetakeConfirmationIndex(null)}
            >
              Batal
            </Button>
            <Button
              className="flex-1 rounded-full bg-white text-black hover:bg-zinc-200 h-12 font-bold"
              onClick={() => {
                if (retakeConfirmationIndex !== null) {
                  onRetakePhoto(retakeConfirmationIndex);
                  setRetakeConfirmationIndex(null);
                }
              }}
            >
              Ya, Foto Ulang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
