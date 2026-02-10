import { useState, useMemo, useCallback } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/client";
import { PaymentMethod, TemplateOption } from "../types";
import { loadImage } from "../utils";

export function useBoothData() {
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

  const supabase = useMemo(() => supabaseState.client, [supabaseState.client]);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [nonCashMethods, setNonCashMethods] = useState<PaymentMethod[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [pricing, setPricing] = useState({ 
    basePrice: 20000, 
    perPrintPrice: 5000, 
    sessionCountdown: 300,
    homeImageUrl: null as string | null,
    price2d: 20000,
    price4r: 20000,
    is2dEnabled: true,
    is4rEnabled: true,
    perPrintPrice2d: 5000,
    perPrintPrice4r: 5000
  });

  const loadPaymentMethods = useCallback(async () => {
    if (!supabase) {
      setPaymentMethods([
        { id: "cash", name: "Tunai", type: "cash", is_active: true },
        { id: "qris", name: "QRIS", type: "non_cash", is_active: true },
        { id: "gopay", name: "GoPay", type: "non_cash", is_active: true },
        { id: "ovo", name: "OVO", type: "non_cash", is_active: true },
      ]);
      setNonCashMethods([
        { id: "qris", name: "QRIS", type: "non_cash", is_active: true },
        { id: "gopay", name: "GoPay", type: "non_cash", is_active: true },
        { id: "ovo", name: "OVO", type: "non_cash", is_active: true },
      ]);
      return [
        { id: "cash", name: "Tunai", type: "cash", is_active: true },
        { id: "qris", name: "QRIS", type: "non_cash", is_active: true },
        { id: "gopay", name: "GoPay", type: "non_cash", is_active: true },
        { id: "ovo", name: "OVO", type: "non_cash", is_active: true },
      ];
    }
    const { data } = await supabase
      .from("payment_methods")
      .select("id,name,type,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const methods = data ?? [];
    const nonCash = methods.filter((method) => method.type === "non_cash");
    setPaymentMethods(methods);
    setNonCashMethods(nonCash);
    return methods;
  }, [supabase]);

  const loadPricing = useCallback(async () => {
    if (!supabase) {
      return;
    }
    
    // Try to select with session_countdown and home_image_url
    const { data, error } = await supabase
      .from("pricing_settings")
      .select("id,base_price,per_print_price,session_countdown,home_image_url,price_2d,price_4r,is_2d_enabled,is_4r_enabled,per_print_price_2d,per_print_price_4r,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code === "PGRST200") {
        // Fallback if column doesn't exist
        console.warn("Columns missing in pricing_settings, using default.");
        const { data: fallbackData } = await supabase
          .from("pricing_settings")
          .select("id,base_price,per_print_price,updated_at")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (fallbackData) {
            setPricing({
                basePrice: Number(fallbackData.base_price),
                perPrintPrice: Number(fallbackData.per_print_price),
                sessionCountdown: 300,
                homeImageUrl: null,
                price2d: Number(fallbackData.base_price), // Fallback to base
                price4r: Number(fallbackData.base_price), // Fallback to base
                is2dEnabled: true,
                is4rEnabled: true,
                perPrintPrice2d: Number(fallbackData.per_print_price),
                perPrintPrice4r: Number(fallbackData.per_print_price),
            });
        }
        return;
    }

    if (data) {
      let homeImageUrl = null;
      if (data.home_image_url) {
        if (data.home_image_url.startsWith("http")) {
            homeImageUrl = data.home_image_url;
        } else {
             // Get public url
             const { data: publicUrlData } = supabase
                .storage
                .from('templates')
                .getPublicUrl(data.home_image_url);
             homeImageUrl = publicUrlData.publicUrl;
        }
      }

      setPricing({
        basePrice: Number(data.base_price),
        perPrintPrice: Number(data.per_print_price),
        sessionCountdown: Number(data.session_countdown || 300),
        homeImageUrl: homeImageUrl,
        price2d: Number(data.price_2d || data.base_price),
        price4r: Number(data.price_4r || data.base_price),
        is2dEnabled: data.is_2d_enabled ?? true,
        is4rEnabled: data.is_4r_enabled ?? true,
        perPrintPrice2d: Number(data.per_print_price_2d ?? data.per_print_price),
        perPrintPrice4r: Number(data.per_print_price_4r ?? data.per_print_price),
      });
    }
  }, [supabase]);

  const loadTemplates = useCallback(async () => {
    if (!supabase) {
      setTemplates([]);
      return [];
    }
    const { data } = await supabase
      .from("templates")
      .select("id,name,file_path,created_at,photo_x,photo_y,photo_width,photo_height,slots_config,type")
      .order("created_at", { ascending: false });
    
    const mapped =
      (await Promise.all(
        (data ?? []).map(async (template) => {
          const slots_config = template.slots_config
            ? typeof template.slots_config === "string"
              ? JSON.parse(template.slots_config)
              : template.slots_config
            : [];
          
          if (template.file_path.startsWith("http")) {
            return {
              id: template.id,
              name: template.name,
              file_path: template.file_path,
              url: template.file_path,
              type: template.type as "2d" | "4r" | undefined,
              slots: slots_config.length > 0 ? slots_config.length : 1,
              photo_x: template.photo_x,
              photo_y: template.photo_y,
              photo_width: template.photo_width,
              photo_height: template.photo_height,
              slots_config,
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
            type: template.type as "2d" | "4r" | undefined,
            slots: slots_config.length > 0 ? slots_config.length : 1,
            photo_x: template.photo_x,
            photo_y: template.photo_y,
            photo_width: template.photo_width,
            photo_height: template.photo_height,
            slots_config,
          };
        })
      )) ?? [];
    
    const available = mapped.filter((item) => item.url);
    setTemplates(available);
    return available;
  }, [supabase]);

  const createTransaction = useCallback(async (total: number, paymentMethod?: string, templateId?: string, packageType?: string) => {
    if (!supabase) {
      return null;
    }
    const { data } = await supabase
      .from("transactions")
      .insert({
        total_price: total,
        payment_method: paymentMethod,
        payment_status: "pending",
        template_id: templateId ?? null,
        package_type: packageType ?? "4r",
      })
      .select("id")
      .single();
    return data?.id ?? null;
  }, [supabase]);

  const updateTransactionStatus = useCallback(async (id: string, status: "paid" | "pending" | "canceled") => {
    if (!supabase) return;
    await supabase
      .from("transactions")
      .update({ payment_status: status })
      .eq("id", id);
  }, [supabase]);

  return {
    supabase,
    paymentMethods,
    nonCashMethods,
    templates,
    pricing,
    loadPaymentMethods,
    loadPricing,
    loadTemplates,
    createTransaction,
    updateTransactionStatus,
  };
}
