import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface IdleStepProps {
  onStart: () => void;
}

export function IdleStep({ onStart }: IdleStepProps) {
  return (
    <motion.section
      key="idle"
      className="relative flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center overflow-hidden rounded-3xl border border-border bg-black/40 px-6 py-12 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.4),_transparent_60%)]"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div
        className="relative flex flex-col items-center gap-6"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        <Button size="lg" onClick={onStart}>
          Tap to Start
        </Button>
        <p className="max-w-md text-sm text-muted-foreground">
          Sentuh layar untuk memulai transaksi photobooth.
        </p>
      </motion.div>
    </motion.section>
  );
}
