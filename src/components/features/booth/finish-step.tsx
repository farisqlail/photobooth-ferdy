import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface FinishStepProps {
  onReset: () => void;
}

export function FinishStep({ onReset }: FinishStepProps) {
  return (
    <motion.section
      key="finish"
      className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center gap-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-3xl font-semibold">Terima kasih!</h2>
      <p className="text-sm text-muted-foreground">
        Layar akan kembali ke awal dalam 10 detik.
      </p>
      <Button onClick={onReset}>Kembali ke Idle</Button>
    </motion.section>
  );
}
