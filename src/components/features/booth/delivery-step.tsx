import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Printer, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import { Step, TransactionData } from "./types";

interface DeliveryStepProps {
  finalPreviewUrl: string | null;
  storageUrl: string | null;
  transaction: TransactionData;
  onSetEmail: (email: string) => void;
  onGoToStep: (step: Step) => void;
  isUploading: boolean;
}

export function DeliveryStep({
  finalPreviewUrl,
  storageUrl,
  transaction,
  onSetEmail,
  onGoToStep,
  isUploading,
}: DeliveryStepProps) {
  return (
    <motion.section
      key="delivery"
      className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-4xl">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="print-area relative w-full overflow-hidden rounded-2xl border border-border bg-black">
            {finalPreviewUrl ? (
              <Image
                src={finalPreviewUrl}
                alt="Final"
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
                Memproses hasil foto.
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="h-4 w-4" />
              Scan QR untuk Download
            </div>
            {storageUrl ? (
              storageUrl.startsWith("data:") ? (
                <div className="text-sm text-muted-foreground">
                  QR tidak tersedia untuk file lokal. Unggah selesai dulu.
                </div>
              ) : (
                <QRCodeCanvas value={storageUrl} size={180} />
              )
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyiapkan file
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              Kirim lewat Email
            </div>
            <Input
              placeholder="Email pelanggan"
              value={transaction.email ?? ""}
              onChange={(event) => onSetEmail(event.target.value)}
            />
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Cetak Foto
            </Button>
            <Button variant="secondary" onClick={() => onGoToStep("finish")}>
              Selesai
            </Button>
            {isUploading && (
              <span className="text-xs text-muted-foreground">
                Mengunggah ke Supabase...
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}
