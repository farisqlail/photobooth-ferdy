import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Home } from "lucide-react";

interface FinishStepProps {
  onReset: () => void;
}

export function FinishStep({ onReset }: FinishStepProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <motion.section
      key="finish"
      className="flex h-full w-full flex-col items-center justify-center gap-8 rounded-[2rem] bg-black p-8 text-center text-white shadow-2xl border border-zinc-800"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
       {/* Icon */}
       <motion.div 
         initial={{ scale: 0 }}
         animate={{ scale: 1 }}
         transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
         className="flex h-40 w-40 items-center justify-center rounded-full bg-zinc-900 border-4 border-zinc-800 shadow-[0_0_40px_rgba(34,197,94,0.2)]"
       >
          <CheckCircle2 className="h-20 w-20 text-green-500" />
       </motion.div>
       
       <div className="space-y-4 max-w-lg">
           <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
             Terima Kasih!
           </h2>
           <p className="text-xl text-zinc-400">
             Silakan ambil hasil foto cetak Anda di printer tray.
           </p>
       </div>

       <div className="mt-8 flex flex-col items-center gap-4">
           <div className="rounded-2xl bg-zinc-900/50 px-8 py-4 border border-zinc-800 backdrop-blur-sm">
               <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-1">
                 Kembali ke Home dalam
               </p>
               <p className="text-4xl font-mono font-bold text-white tabular-nums">
                 {countdown}
               </p>
           </div>

           <Button 
             onClick={() => router.push('/')}
             className="h-14 px-8 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-lg shadow-lg transition-all hover:scale-105"
           >
             <Home className="mr-2 h-5 w-5" />
             Kembali Sekarang
           </Button>
       </div>
    </motion.section>
  );
}
