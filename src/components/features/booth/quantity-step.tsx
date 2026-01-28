import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Step } from "./types";
import { quantityOptions } from "./constants";

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
    <motion.section
      key="quantity"
      className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Jumlah Cetak</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-3">
            {quantityOptions.map((option) => (
              <Button
                key={option}
                size="lg"
                variant={selectedQty === option ? "default" : "outline"}
                onClick={() => setSelectedQty(option)}
              >
                {option} Lembar
              </Button>
            ))}
          </div>
          
          <div className="rounded-lg bg-muted p-4">
             <div className="flex justify-between text-sm">
                <span>Harga Dasar</span>
                <span>Rp {pricing.basePrice.toLocaleString()}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span>Tambahan per lembar</span>
                <span>Rp {pricing.perPrintPrice.toLocaleString()} x {selectedQty}</span>
             </div>
             <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                <span>Total</span>
                <span>Rp {currentTotal.toLocaleString()}</span>
             </div>
          </div>

          <Button 
            size="lg" 
            className="w-full"
            onClick={() => onSelectQuantity(selectedQty)}
          >
             Lanjut Pembayaran (Rp {currentTotal.toLocaleString()})
          </Button>
        </CardContent>
      </Card>
      <Button variant="ghost" onClick={() => onGoToStep("template")}>
        <ChevronLeft className="h-4 w-4" />
        Kembali
      </Button>
    </motion.section>
  );
}
