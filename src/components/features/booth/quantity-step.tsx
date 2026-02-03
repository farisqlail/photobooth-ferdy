import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, Minus, Plus, Printer, Receipt } from "lucide-react";
import { motion } from "framer-motion";
import { Step } from "./types";
import { quantityOptions } from "./constants";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface QuantityStepProps {
  pricing: { basePrice: number; perPrintPrice: number };
  quantity: number;
  onSelectQuantity: (quantity: number) => void;
  onGoToStep: (step: Step) => void;
}

export function QuantityStep({
  pricing,
  quantity,
  onSelectQuantity,
  onGoToStep,
}: QuantityStepProps) {
  const [selectedQty, setSelectedQty] = useState(quantity);
  
  const currentTotal = pricing.basePrice + selectedQty * pricing.perPrintPrice;

  return (
    <motion.div
      className="flex h-full w-full gap-8 p-2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* COLUMN 1: Selection */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-6 flex items-center gap-4">
          <Button 
             variant="ghost" 
             size="icon" 
             className="h-12 w-12 rounded-full bg-black text-white hover:bg-black/80 hover:scale-105 transition-all shadow-lg"
             onClick={() => onGoToStep("template")}
           >
             <ChevronLeft className="h-6 w-6" />
           </Button>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-white drop-shadow-md">Jumlah Cetak</h2>
            <p className="text-sm text-white/90 font-medium drop-shadow-sm">
               Tentukan berapa banyak foto yang ingin dicetak
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="grid w-full max-w-3xl grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {quantityOptions.map((option) => {
              const isSelected = selectedQty === option;
              return (
                <button
                  key={option}
                  onClick={() => setSelectedQty(option)}
                  className={cn(
                    "group relative flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[2rem] transition-all duration-300",
                    isSelected 
                      ? "bg-white ring-4 ring-black shadow-2xl scale-[1.05] z-10" 
                      : "bg-white/90 hover:bg-white hover:scale-[1.02] hover:shadow-xl opacity-90 hover:opacity-100"
                  )}
                >
                  <span className={cn(
                    "text-6xl font-black tracking-tighter transition-all duration-300",
                    isSelected ? "text-black scale-110" : "text-zinc-400 group-hover:text-zinc-600"
                  )}>
                    {option}
                  </span>
                  <span className={cn(
                    "text-sm font-bold uppercase tracking-widest",
                    isSelected ? "text-black" : "text-zinc-400 group-hover:text-zinc-600"
                  )}>
                    Lembar
                  </span>
                  
                  {isSelected && (
                    <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-black animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* COLUMN 2: Summary & Action */}
      <div className="flex w-[35%] flex-col rounded-[2.5rem] bg-black p-4 shadow-2xl text-white h-full">
        <div className="relative flex-1 w-full overflow-hidden rounded-[2rem] bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center justify-center text-center">
           {/* Background Pattern */}
           <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black opacity-50" />
           
           <div className="relative z-10 flex flex-col items-center gap-6">
             <div className="flex h-32 w-32 items-center justify-center rounded-full bg-zinc-800 shadow-inner">
                <Printer className="h-16 w-16 text-zinc-400" />
             </div>
             
             <div className="space-y-2">
               <h3 className="text-xl font-medium text-zinc-300">Rincian Biaya</h3>
               <div className="flex flex-col gap-4 rounded-2xl bg-black/40 p-6 w-full min-w-[280px] backdrop-blur-sm border border-white/5">
                 <div className="flex justify-between text-sm text-zinc-400">
                    <span>Harga Dasar</span>
                    <span>Rp {pricing.basePrice.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between text-sm text-zinc-400">
                    <span>Tambahan ({selectedQty}x)</span>
                    <span>Rp {(selectedQty * pricing.perPrintPrice).toLocaleString()}</span>
                 </div>
                 <div className="mt-2 flex justify-between border-t border-white/10 pt-4 text-2xl font-bold text-white">
                    <span>Total</span>
                    <span>Rp {currentTotal.toLocaleString()}</span>
                 </div>
               </div>
             </div>
           </div>
        </div>
        
        <div className="mt-4 px-2 pb-2">
           <div className="flex items-end justify-between mb-6">
              <div className="flex-1 mr-4">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Total Quantity</p>
                <p className="font-bold text-4xl leading-tight">{selectedQty} <span className="text-lg text-zinc-500 font-normal">Lembar</span></p>
              </div>
           </div>

           <Button 
             size="lg" 
             className="w-full rounded-full bg-white text-black hover:bg-zinc-200 h-20 text-xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
             onClick={() => onSelectQuantity(selectedQty)}
           >
             Bayar Sekarang
             <ArrowRight className="ml-3 h-6 w-6" />
           </Button>
        </div>
      </div>
    </motion.div>
  );
}
