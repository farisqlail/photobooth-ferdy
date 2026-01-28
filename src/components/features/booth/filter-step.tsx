import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Step, TemplateOption } from "./types";
import { filters } from "./constants";
import { RefObject } from "react";

interface FilterStepProps {
  capturedPhotos: string[];
  selectedTemplate: TemplateOption | null;
  templateImage: HTMLImageElement | null;
  containerSize: { width: number; height: number };
  previewContainerRef: RefObject<HTMLDivElement | null>;
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
  onGoToStep: (step: Step) => void;
  onGenerateFinalImage: () => void;
}

export function FilterStep({
  capturedPhotos,
  selectedTemplate,
  templateImage,
  containerSize,
  previewContainerRef,
  selectedFilter,
  onSelectFilter,
  onGoToStep,
  onGenerateFinalImage,
}: FilterStepProps) {
  return (
    <motion.section
      key="filter"
      className="flex min-h-[calc(100vh-14rem)] flex-col gap-8 lg:flex-row"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left: Preview */}
      <div
        ref={previewContainerRef}
        className="relative flex-1 w-full overflow-hidden rounded-3xl border border-border bg-black shadow-lg flex items-center justify-center"
      >
        {containerSize.width > 0 && templateImage && selectedTemplate ? (
          <div
            style={{
              position: "relative",
              width:
                templateImage.naturalWidth *
                Math.min(
                  containerSize.width / templateImage.naturalWidth,
                  containerSize.height / templateImage.naturalHeight
                ),
              height:
                templateImage.naturalHeight *
                Math.min(
                  containerSize.width / templateImage.naturalWidth,
                  containerSize.height / templateImage.naturalHeight
                ),
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
              const scale = Math.min(
                containerSize.width / templateImage.naturalWidth,
                containerSize.height / templateImage.naturalHeight
              );

              return (
                <div
                  key={index}
                  className="absolute overflow-hidden"
                  style={{
                    left: slot.x * scale,
                    top: slot.y * scale,
                    width: slot.width * scale,
                    height: slot.height * scale,
                    zIndex: 0,
                  }}
                >
                  <Image
                    src={photo}
                    alt="captured"
                    fill
                    className="object-cover"
                    style={{ filter: selectedFilter }}
                    unoptimized
                  />
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
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Memuat preview...</p>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex w-full flex-col gap-8 lg:w-96">
        <div className="text-center lg:text-left">
          <h2 className="text-2xl font-semibold">Customize your photo</h2>
          <p className="text-sm text-muted-foreground">
            Pilih filter untuk foto Anda
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium text-muted-foreground">Filters</h3>
          <div className="grid grid-cols-4 gap-3">
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={`group relative aspect-square overflow-hidden rounded-full border-2 transition-all hover:scale-105 ${
                  selectedFilter === filter.value
                    ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "border-transparent hover:border-primary/50"
                }`}
                onClick={() => onSelectFilter(filter.value)}
              >
                {capturedPhotos[0] && (
                  <Image
                    src={capturedPhotos[0]}
                    alt={filter.label}
                    fill
                    unoptimized
                    className="object-cover"
                    style={{ filter: filter.value }}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-[10px] font-medium text-white shadow-sm">
                    {filter.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto flex gap-3 pt-4">
          <Button
            variant="destructive"
            size="lg"
            className="flex-1 h-12 rounded-full text-base bg-pink-500 hover:bg-pink-600 text-white border-none"
            onClick={() => onGoToStep("session")}
          >
            Retake
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-12 rounded-full text-base border-pink-500 text-pink-500 hover:bg-pink-50"
            onClick={onGenerateFinalImage}
          >
            DONE
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
