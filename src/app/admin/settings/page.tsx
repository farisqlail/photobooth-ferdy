"use client";

import { Printer } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { useToast } from "../../../components/ui/toast";

type PaymentMethod = {
  id: string;
  name: string;
  type: "cash" | "non_cash";
  is_active: boolean;
};

export default function AdminSettingsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // Printer Settings State
  const [printers, setPrinters] = useState<{ Name: string }[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    const fetchPrinters = async () => {
        setLoadingPrinters(true);
        try {
            const [printersRes, configRes] = await Promise.all([
                fetch('/api/system/printers'),
                fetch('/api/system/printer-config')
            ]);
            
            if (printersRes.ok) {
                const data = await printersRes.json();
                setPrinters(Array.isArray(data) ? data : []);
            }
            
            if (configRes.ok) {
                const config = await configRes.json();
                if (config.printerName) setSelectedPrinter(config.printerName);
            }
        } catch (e) {
            console.error("Failed to load printer settings", e);
        } finally {
            setLoadingPrinters(false);
        }
    };
    fetchPrinters();
  }, []);

  const savePrinterSettings = async () => {
    try {
        await fetch('/api/system/printer-config', {
            method: 'POST',
            body: JSON.stringify({ printerName: selectedPrinter })
        });
        showToast({ variant: "success", message: "Pengaturan printer disimpan" });
    } catch (e) {
        showToast({ variant: "error", message: "Gagal menyimpan pengaturan printer" });
    }
  };



  const [loading, setLoading] = useState(true);
  const [supabaseState] = useState(() => {
    try {
      return { client: createSupabaseBrowserClient(), error: null as string | null };
    } catch (error) {
      return {
        client: null,
        error: error instanceof Error ? error.message : "Supabase error",
      };
    }
  });
  const supabase = supabaseState.client;

  const loadPaymentMethods = useCallback(async () => {
    if (!supabase) {
      return;
    }
    const { data } = await supabase
      .from("payment_methods")
      .select("id,name,type,is_active")
      .order("sort_order", { ascending: true });
    setPaymentMethods(data ?? []);
  }, [supabase]);

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      await loadPaymentMethods();
      setLoading(false);
    };
    run();
  }, [loadPaymentMethods, supabase]);

  useEffect(() => {
    if (supabaseState.error) {
      showToast({ variant: "error", message: supabaseState.error });
    }
  }, [showToast, supabaseState.error]);

  const togglePayment = async (method: PaymentMethod) => {
    if (!supabase) {
      return;
    }
    const next = !method.is_active;
    const { error } = await supabase
      .from("payment_methods")
      .update({ is_active: next })
      .eq("id", method.id);
    if (error) {
      showToast({ variant: "error", message: error.message });
      return;
    }
    setPaymentMethods((prev) =>
      prev.map((item) => (item.id === method.id ? { ...item, is_active: next } : item))
    );
    showToast({
      variant: "success",
      message: `${method.name} ${next ? "diaktifkan" : "dinonaktifkan"}.`,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Memuat pengaturan...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Payment Manager</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {paymentMethods.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Belum ada metode pembayaran.
              </p>
            )}
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      method.is_active
                        ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                        : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{method.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {method.name === "Event"
                        ? "Event Mode"
                        : method.type === "cash"
                        ? "Tunai"
                        : "Non-Tunai"}
                    </span>
                  </div>
                </div>
                <Button
                  variant={method.is_active ? "default" : "outline"}
                  onClick={() => togglePayment(method)}
                >
                  {method.is_active ? "Aktif" : "Nonaktif"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Printer Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Pilih Printer Aktif
              </span>
              <div className="flex gap-4 items-center">
                <select
                  className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  disabled={loadingPrinters}
                >
                  <option value="">-- Pilih Printer --</option>
                  {printers.map((p) => (
                    <option key={p.Name} value={p.Name}>
                      {p.Name}
                    </option>
                  ))}
                </select>
                <Button onClick={savePrinterSettings} disabled={loadingPrinters}>
                  Simpan
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Printer ini akan digunakan untuk mencetak foto secara otomatis tanpa popup dialog.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}
