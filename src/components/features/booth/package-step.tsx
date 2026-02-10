import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowRight, Printer, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Step } from "./types";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PackageStepProps {
  pricing: {
    price2d: number;
    price4r: number;
    is2dEnabled: boolean;
    is4rEnabled: boolean;
  };
  onSelectPackage: (packageType: "2d" | "4r") => void;
  onGoToStep: (step: Step) => void;
}

export function PackageStep({
  pricing,
  onSelectPackage,
  onGoToStep,
}: PackageStepProps) {

  useEffect(() => {
    if (pricing.is2dEnabled && !pricing.is4rEnabled) {
      onSelectPackage("2d");
    } else if (!pricing.is2dEnabled && pricing.is4rEnabled) {
      onSelectPackage("4r");
    }
  }, [pricing.is2dEnabled, pricing.is4rEnabled, onSelectPackage]);

  const handleSelect = (pkg: "2d" | "4r") => {
    onSelectPackage(pkg);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // If only one package is enabled, hide the UI to prevent flash before auto-redirect
  if ((pricing.is2dEnabled && !pricing.is4rEnabled) || (!pricing.is2dEnabled && pricing.is4rEnabled)) {
    return null;
  }

  return (
    <motion.div
      className="relative flex h-full w-full flex-col items-center pt-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-12 text-center text-white">
        <h2 className="mb-2 text-4xl font-bold drop-shadow-md tracking-tight">Pilih Paket</h2>
        <p className="text-lg opacity-90 drop-shadow-sm font-medium">
           Silakan pilih jenis cetakan foto Anda
        </p>
      </div>

      {/* Back Button */}
      <div className="absolute left-4 top-8 md:left-0">
          <Button 
             variant="ghost" 
             size="icon" 
             className="h-14 w-14 rounded-full bg-black text-white shadow-lg hover:bg-black/80 hover:scale-105 transition-all"
             asChild
           >
             <Link href="/">
               <ChevronLeft className="h-8 w-8" />
             </Link>
           </Button>
      </div>

      <div className="flex-1 flex items-center justify-center gap-8 px-8 w-full max-w-6xl">
        {!pricing.is2dEnabled && !pricing.is4rEnabled && (
            <div className="text-center text-white/80">
                <p className="text-2xl font-medium mb-2">Mohon maaf, saat ini belum ada paket yang tersedia.</p>
                <p className="text-lg">Silakan hubungi petugas.</p>
            </div>
        )}

        {/* 2D Option */}
        {pricing.is2dEnabled && (
        <button
            onClick={() => handleSelect("2d")}
            className="group relative flex aspect-[4/5] w-full max-w-sm flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-white/50"
        >
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
                <div className="p-6 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                    <ImageIcon className="w-16 h-16" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-3xl font-bold text-zinc-900">2D Cutout</h3>
                    <p className="text-zinc-500 font-medium">
                        Cetak foto dengan potongan bentuk unik (2D)
                    </p>
                </div>
            </div>
            
            <div className="flex h-24 w-full items-center justify-between bg-black px-8 text-white">
                <div className="text-2xl font-bold tracking-wide text-blue-300">
                    {formatPrice(pricing.price2d)}
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 transition-all duration-300 group-hover:bg-white group-hover:border-white group-hover:text-black">
                    <ArrowRight className="h-6 w-6" />
                </div>
            </div>
        </button>
        )}

        {/* 4R Option */}
        {pricing.is4rEnabled && (
        <button
            onClick={() => handleSelect("4r")}
            className="group relative flex aspect-[4/5] w-full max-w-sm flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-white/50"
        >
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
                <div className="p-6 rounded-full bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-500">
                    <Printer className="w-16 h-16" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-3xl font-bold text-zinc-900">Standard 4R</h3>
                    <p className="text-zinc-500 font-medium">
                        Cetak foto ukuran standar 4R (4x6 inch)
                    </p>
                </div>
            </div>
            
            <div className="flex h-24 w-full items-center justify-between bg-black px-8 text-white">
                <div className="text-2xl font-bold tracking-wide text-purple-300">
                    {formatPrice(pricing.price4r)}
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 transition-all duration-300 group-hover:bg-white group-hover:border-white group-hover:text-black">
                    <ArrowRight className="h-6 w-6" />
                </div>
            </div>
        </button>
        )}
      </div>
    </motion.div>
  );
}
