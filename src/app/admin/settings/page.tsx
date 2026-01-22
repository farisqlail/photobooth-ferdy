"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderUp, RefreshCcw, Trash2 } from "lucide-react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useToast } from "../../../components/ui/toast";

type PaymentMethod = {
  id: string;
  name: string;
  type: "cash" | "non_cash";
  is_active: boolean;
};

type PricingSettings = {
  id?: string;
  base_price: number;
  per_print_price: number;
};

type Template = {
  id: string;
  name: string;
  file_path: string;
  url: string;
};

export default function AdminSettingsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pricing, setPricing] = useState<PricingSettings>({
    base_price: 20000,
    per_print_price: 5000,
  });
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(
    null
  );
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
  const { showToast } = useToast();

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

  const loadPricing = useCallback(async () => {
    if (!supabase) {
      return;
    }
    const { data } = await supabase
      .from("pricing_settings")
      .select("id,base_price,per_print_price,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setPricing({
        base_price: Number(data.base_price),
        per_print_price: Number(data.per_print_price),
      });
      setPricingId(data.id);
    }
  }, [supabase]);

  const loadTemplates = useCallback(async () => {
    if (!supabase) {
      return;
    }
    const { data } = await supabase
      .from("templates")
      .select("id,name,file_path,created_at")
      .order("created_at", { ascending: false });
    const mapped =
      (await Promise.all(
        (data ?? []).map(async (template) => {
          if (template.file_path.startsWith("http")) {
            return {
              id: template.id,
              name: template.name,
              file_path: template.file_path,
              url: template.file_path,
            };
          }
          const { data: signedData } = await supabase.storage
            .from("templates")
            .createSignedUrl(template.file_path, 3600);
          return {
            id: template.id,
            name: template.name,
            file_path: template.file_path,
            url: signedData?.signedUrl ?? "",
          };
        })
      )) ?? [];
    setTemplates(mapped.filter((item) => item.url));
  }, [supabase]);

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      await Promise.all([loadPaymentMethods(), loadPricing(), loadTemplates()]);
      setLoading(false);
    };
    run();
  }, [loadPaymentMethods, loadPricing, loadTemplates, supabase]);

  useEffect(() => {
    if (supabaseState.error) {
      showToast({ variant: "error", message: supabaseState.error });
    }
  }, [showToast, supabaseState.error]);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  const savePricing = async () => {
    if (!supabase) {
      return;
    }
    if (pricingId) {
      const { error } = await supabase
        .from("pricing_settings")
        .update({
          base_price: pricing.base_price,
          per_print_price: pricing.per_print_price,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pricingId);
      if (error) {
        showToast({ variant: "error", message: error.message });
        return;
      }
      showToast({ variant: "success", message: "Harga berhasil diperbarui." });
      return;
    }
    const { data, error } = await supabase
      .from("pricing_settings")
      .insert({
        base_price: pricing.base_price,
        per_print_price: pricing.per_print_price,
      })
      .select("id")
      .single();
    if (error) {
      showToast({ variant: "error", message: error.message });
      return;
    }
    if (data?.id) {
      setPricingId(data.id);
    }
    showToast({ variant: "success", message: "Harga berhasil disimpan." });
  };

  const uploadTemplate = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);
    const response = await fetch("/api/admin/templates", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showToast({
        variant: "error",
        message: data?.message ?? "Gagal upload template.",
      });
      setUploading(false);
      return;
    }
    await loadTemplates();
    showToast({ variant: "success", message: "Template berhasil diunggah." });
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewSize(null);
    setUploading(false);
  };

  const deleteTemplate = async (template: Template) => {
    const response = await fetch("/api/admin/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: template.id, file_path: template.file_path }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showToast({
        variant: "error",
        message: data?.message ?? "Gagal menghapus template.",
      });
      return;
    }
    setTemplates((prev) => prev.filter((item) => item.id !== template.id));
    showToast({ variant: "success", message: "Template berhasil dihapus." });
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
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{method.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {method.type === "cash" ? "Tunai" : "Non-Tunai"}
                  </span>
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
            <CardTitle>Price Manager</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Harga per sesi
              </span>
              <Input
                type="number"
                value={pricing.base_price}
                onChange={(event) =>
                  setPricing((prev) => ({
                    ...prev,
                    base_price: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Harga per lembar
              </span>
              <Input
                type="number"
                value={pricing.per_print_price}
                onChange={(event) =>
                  setPricing((prev) => ({
                    ...prev,
                    per_print_price: Number(event.target.value),
                  }))
                }
              />
            </div>
            <Button onClick={savePricing}>
              <RefreshCcw className="h-4 w-4" />
              Simpan Harga
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Manager</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <label className="flex cursor-pointer items-center gap-2">
                <FolderUp className="h-4 w-4" />
                Pilih Template
                <input
                  type="file"
                  accept="image/png"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      const objectUrl = URL.createObjectURL(file);
                      setSelectedFile(file);
                      setPreviewUrl(objectUrl);
                      const image = new window.Image();
                      image.onload = () => {
                        setPreviewSize({
                          width: image.naturalWidth,
                          height: image.naturalHeight,
                        });
                      };
                      image.onerror = () => {
                        setPreviewSize(null);
                      };
                      image.src = objectUrl;
                    }
                  }}
                />
              </label>
            </Button>
            <Button
              variant="secondary"
              disabled={!selectedFile || uploading}
              onClick={() => {
                if (selectedFile) {
                  uploadTemplate(selectedFile);
                }
              }}
            >
              Upload Sekarang
            </Button>
            {selectedFile && (
              <Button
                variant="ghost"
                disabled={uploading}
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setPreviewSize(null);
                }}
              >
                Batal
              </Button>
            )}
            {uploading && (
              <span className="text-sm text-muted-foreground">Mengunggah...</span>
            )}
          </div>
          {previewUrl && previewSize && (
            <Card className="w-fit max-w-full">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="overflow-hidden rounded-xl border border-border bg-muted p-2">
                  <Image
                    src={previewUrl}
                    alt={selectedFile?.name ?? "Preview"}
                    width={previewSize.width}
                    height={previewSize.height}
                    unoptimized
                    className="h-auto w-auto max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Preview Template</span>
                  <span className="text-muted-foreground">
                    {selectedFile?.name ?? "template.png"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.length === 0 && (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Template belum tersedia.
                </CardContent>
              </Card>
            )}
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                    <Image
                      src={template.url}
                      alt={template.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{template.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTemplate(template)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
