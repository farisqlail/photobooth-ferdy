import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import { Step, TransactionData } from "./types";

interface QrisStepProps {
  transaction: TransactionData;
  onSimulatePaid: () => void;
  onGoToStep: (step: Step) => void;
}

export function QrisStep({ transaction, onSimulatePaid, onGoToStep }: QrisStepProps) {
  // Use transaction ID or a static string for QR
  const qrValue = transaction.id || "simulated-qris-code";

  return (
    <motion.section
      key="qris"
      className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>QRIS Payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <QRCodeCanvas value={qrValue} size={220} />
          <p className="text-sm text-muted-foreground">
            Scan QRIS untuk melakukan pembayaran.
          </p>
          <p className="text-xs text-muted-foreground">
             Total: Rp {transaction.total_price.toLocaleString()}
          </p>
          <Button size="lg" onClick={onSimulatePaid}>
            Simulasi Bayar Berhasil
          </Button>
        </CardContent>
      </Card>
      <Button variant="ghost" onClick={() => onGoToStep("quantity")}>
        <ChevronLeft className="h-4 w-4" />
        Kembali
      </Button>
    </motion.section>
  );
}
