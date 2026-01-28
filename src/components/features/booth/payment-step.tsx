import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { PaymentMethod, Step } from "./types";

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
  return (
    <motion.section
      key="payment"
      className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tunai</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Bayar di kasir dan lanjutkan sesi foto.
            </p>
            <Button
              size="lg"
              onClick={() =>
                onSelectPayment(
                  paymentOptions[0] ?? {
                    id: "cash",
                    name: "Tunai",
                    type: "cash",
                    is_active: true,
                  }
                )
              }
            >
              Pilih Tunai
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Non-Tunai</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Bayar lewat QRIS atau e-wallet.
            </p>
            <Button
              size="lg"
              variant="secondary"
              disabled={!nonCashAvailable}
              onClick={() => onGoToStep("noncash")}
            >
              Pilih Non-Tunai
            </Button>
          </CardContent>
        </Card>
      </div>
      <Button variant="ghost" onClick={() => onGoToStep("idle")}>
        <ChevronLeft className="h-4 w-4" />
        Kembali
      </Button>
    </motion.section>
  );
}
