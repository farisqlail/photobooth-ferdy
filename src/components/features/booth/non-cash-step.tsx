import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { PaymentMethod, Step } from "./types";

interface NonCashStepProps {
  nonCashMethods: PaymentMethod[];
  onSelectNonCash: (method: PaymentMethod) => void;
  onGoToStep: (step: Step) => void;
}

export function NonCashStep({
  nonCashMethods,
  onSelectNonCash,
  onGoToStep,
}: NonCashStepProps) {
  return (
    <motion.section
      key="noncash"
      className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nonCashMethods.map((method) => (
          <Card key={method.id}>
            <CardContent className="flex flex-col gap-4 p-6">
              <span className="text-lg font-semibold">{method.name}</span>
              <Button size="lg" onClick={() => onSelectNonCash(method)}>
                Pilih
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex gap-4">
        <Button variant="ghost" onClick={() => onGoToStep("payment")}>
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>
    </motion.section>
  );
}
