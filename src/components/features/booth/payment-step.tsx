import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, QrCode, Ticket, Banknote, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { PaymentMethod, Step } from "./types";
import { cn } from "@/lib/utils";

interface PaymentStepProps {
  paymentOptions: PaymentMethod[];
  nonCashAvailable: boolean;
  onSelectPayment: (method: PaymentMethod) => void;
  onGoToStep: (step: Step) => void;
}

export function PaymentStep({
  paymentOptions,
  nonCashAvailable,
  onSelectPayment,
  onGoToStep,
}: PaymentStepProps) {

  // Helper to determine icon based on method name/type
  const getIcon = (name: string, type: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("ticket") || lowerName.includes("voucher") || lowerName.includes("coupon")) {
      return <Ticket strokeWidth={1.5} className="h-32 w-32 text-black" />;
    }
    if (lowerName.includes("scan") || lowerName.includes("qris") || lowerName.includes("qr")) {
      return <QrCode strokeWidth={1.5} className="h-32 w-32 text-black" />;
    }
    if (type === "non_cash" || lowerName.includes("cashless") || lowerName.includes("card")) {
      return <Smartphone strokeWidth={1.5} className="h-32 w-32 text-black" />;
    }
    // Default cash
    return <Banknote strokeWidth={1.5} className="h-32 w-32 text-black" />;
  };

  return (
    <motion.section
      key="payment"
      className="relative flex min-h-[calc(100vh-14rem)] w-full flex-col items-center pt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header Section */}
      <div className="mb-12 text-center text-white">
        <h1 className="mb-2 text-4xl font-bold drop-shadow-md tracking-tight">Pilih Metode Pembayaran</h1>
        <p className="text-lg opacity-90 drop-shadow-sm font-medium">Klik icon untuk memilih metode yang akan kamu pakai</p>
      </div>

      {/* Back Button (Top Left) */}
      <div className="absolute left-4 top-8 md:left-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-14 w-14 rounded-full bg-black text-white shadow-lg hover:bg-black/80 hover:scale-105 transition-all"
          onClick={() => onGoToStep("quantity")}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      </div>

      {/* Cards Grid */}
      <div className="grid w-full max-w-6xl grid-cols-1 gap-8 px-4 md:grid-cols-2 lg:grid-cols-3">
        {paymentOptions.map((method) => (
          <button
            key={method.id}
            onClick={() => onSelectPayment(method)}
            className="group relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-white/50"
          >
            {/* Top: Icon Area */}
            <div className="flex flex-1 items-center justify-center p-8 transition-transform duration-500 group-hover:scale-110">
              {getIcon(method.name, method.type)}
            </div>

            {/* Bottom: Label Area */}
            <div className="flex h-24 w-full items-center justify-between bg-black px-8 text-white">
              <span className="text-2xl font-bold tracking-wide">
                {method.name === "Event" ? "Event Mode" : method.name}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 transition-all duration-300 group-hover:bg-white group-hover:border-white group-hover:text-black">
                <ArrowRight className="h-6 w-6" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
