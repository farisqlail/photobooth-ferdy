"use client";

import Image from "next/image";
import {
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Printer,
  QrCode,
  Sparkles,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

type Step =
  | "idle"
  | "payment"
  | "noncash"
  | "template"
  | "quantity"
  | "qris"
  | "session"
  | "filter"
  | "delivery"
  | "finish";

type TransactionData = {
  id?: string;
  total_price: number;
  payment_method?: string;
  payment_status: "pending" | "paid" | "canceled";
  template_id?: string;
  photo_url?: string;
  quantity: number;
  email?: string;
};

type State = {
  step: Step;
  transaction: TransactionData;
};

type Action =
  | { type: "SET_STEP"; step: Step }
  | { type: "SET_PAYMENT_METHOD"; method: string }
  | { type: "SET_TEMPLATE"; templateId: string }
  | { type: "SET_QUANTITY"; quantity: number }
  | { type: "SET_TOTAL_PRICE"; total: number }
  | { type: "SET_PAYMENT_STATUS"; status: TransactionData["payment_status"] }
  | { type: "SET_TRANSACTION_ID"; id: string }
  | { type: "SET_PHOTO_URL"; url: string }
  | { type: "SET_EMAIL"; email: string }
  | { type: "RESET" };

type PaymentMethod = {
  id: string;
  name: string;
  type: "cash" | "non_cash";
  is_active: boolean;
};

type TemplateOption = {
  id: string;
  name: string;
  file_path: string;
  url: string;
  slots?: number;
};

type FilterOption = {
  id: string;
  label: string;
  value: string;
};

const filters: FilterOption[] = [
  { id: "natural", label: "Natural", value: "none" },
  { id: "bw", label: "B&W", value: "grayscale(100%)" },
  { id: "sepia", label: "Sepia", value: "sepia(80%)" },
  { id: "vivid", label: "Vivid", value: "contrast(1.1) saturate(1.2)" },
];

const quantityOptions = [1, 2, 3];

const initialState: State = {
  step: "idle",
  transaction: {
    total_price: 0,
    payment_status: "pending",
    quantity: 1,
  },
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_PAYMENT_METHOD":
      return {
        ...state,
        transaction: { ...state.transaction, payment_method: action.method },
      };
    case "SET_TEMPLATE":
      return {
        ...state,
        transaction: { ...state.transaction, template_id: action.templateId },
      };
    case "SET_QUANTITY":
      return {
        ...state,
        transaction: { ...state.transaction, quantity: action.quantity },
      };
    case "SET_TOTAL_PRICE":
      return {
        ...state,
        transaction: { ...state.transaction, total_price: action.total },
      };
    case "SET_PAYMENT_STATUS":
      return {
        ...state,
        transaction: { ...state.transaction, payment_status: action.status },
      };
    case "SET_TRANSACTION_ID":
      return {
        ...state,
        transaction: { ...state.transaction, id: action.id },
      };
    case "SET_PHOTO_URL":
      return {
        ...state,
        transaction: { ...state.transaction, photo_url: action.url },
      };
    case "SET_EMAIL":
      return {
        ...state,
        transaction: { ...state.transaction, email: action.email },
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
};

export default function BoothPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [nonCashMethods, setNonCashMethods] = useState<PaymentMethod[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [pricing, setPricing] = useState({ basePrice: 20000, perPrintPrice: 5000 });
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateOption | null>(null);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(filters[0].value);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [finalPreviewUrl, setFinalPreviewUrl] = useState<string | null>(null);
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);

  const supabase = useMemo(() => supabaseState.client, [supabaseState.client]);

  const stepLabel = useMemo(() => {
    switch (state.step) {
      case "payment":
        return "Payment Method Selection";
      case "noncash":
        return "Non-Cash Type Selection";
      case "template":
        return "Template Selection";
      case "quantity":
        return "Print Quantity Selection";
      case "qris":
        return "QRIS Payment Display";
      case "session":
        return "Photo Session";
      case "filter":
        return "Filter Selection";
      case "delivery":
        return "Delivery / Result";
      case "finish":
        return "Finish";
      default:
        return "Idle Screen";
    }
  }, [state.step]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {}
  }, []);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const clearFinishTimer = () => {
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  };

  const resetFlow = () => {
    clearFinishTimer();
    dispatch({ type: "RESET" });
    setSelectedTemplate(null);
    setTemplates([]);
    setTemplateImage(null);
    setSelectedFilter(filters[0].value);
    setCapturedPhotos([]);
    setFinalPreviewUrl(null);
    setStorageUrl(null);
    setCountdown(null);
  };

  const goToStep = async (step: Step) => {
    clearFinishTimer();
    if (step === "session") {
      await startCamera();
    } else {
      stopCamera();
    }
    dispatch({ type: "SET_STEP", step });
    if (step === "finish") {
      finishTimerRef.current = window.setTimeout(() => {
        resetFlow();
      }, 10000);
    }
  };

  const loadPaymentMethods = async () => {
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
      return;
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
  };

  const loadPricing = async () => {
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
        basePrice: Number(data.base_price),
        perPrintPrice: Number(data.per_print_price),
      });
    }
  };

  const loadTemplates = async () => {
    if (!supabase) {
      setTemplates([]);
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
    const available = mapped.filter((item) => item.url);
    setTemplates(available);
    setSelectedTemplate(available[0] ?? null);
    if (available[0]) {
      const image = await loadImage(available[0].url);
      setTemplateImage(image);
      dispatch({ type: "SET_TEMPLATE", templateId: available[0].id });
    }
  };

  const loadImage = async (src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image load failed"));
      image.src = src;
    });
  };

  const handleStart = async () => {
    await loadPricing();
    await loadPaymentMethods();
    await goToStep("payment");
  };

  const handleSelectPayment = async (method: PaymentMethod) => {
    dispatch({ type: "SET_PAYMENT_METHOD", method: method.name });
    if (method.type === "cash") {
      await loadTemplates();
      await goToStep("template");
      return;
    }
    await goToStep("noncash");
  };

  const handleSelectNonCash = async (method: PaymentMethod) => {
    dispatch({ type: "SET_PAYMENT_METHOD", method: method.name });
    await loadTemplates();
    await goToStep("template");
  };

  const handleTemplateSelect = async (template: TemplateOption) => {
    setSelectedTemplate(template);
    dispatch({ type: "SET_TEMPLATE", templateId: template.id });
    const image = await loadImage(template.url);
    setTemplateImage(image);
  };

  const handleGoToQuantity = async () => {
    if (!selectedTemplate) {
      return;
    }
    await goToStep("quantity");
  };

  const createTransaction = async (total: number) => {
    if (!supabase) {
      return null;
    }
    const { data } = await supabase
      .from("transactions")
      .insert({
        total_price: total,
        payment_method: state.transaction.payment_method,
        payment_status: "pending",
        template_id: selectedTemplate?.id ?? null,
      })
      .select("id")
      .single();
    return data?.id ?? null;
  };

  const handleQuantitySelect = async (quantity: number) => {
    dispatch({ type: "SET_QUANTITY", quantity });
    const total = pricing.basePrice + quantity * pricing.perPrintPrice;
    dispatch({ type: "SET_TOTAL_PRICE", total });
    const transactionId = await createTransaction(total);
    if (transactionId) {
      dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
    }
    if (state.transaction.payment_method?.toLowerCase() === "tunai") {
      dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
      if (transactionId && supabase) {
        await supabase
          .from("transactions")
          .update({ payment_status: "paid" })
          .eq("id", transactionId);
      }
      await goToStep("session");
      return;
    }
    await goToStep("qris");
  };

  const handleSimulatePaid = async () => {
    dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
    if (supabase && state.transaction.id) {
      await supabase
        .from("transactions")
        .update({ payment_status: "paid" })
        .eq("id", state.transaction.id);
    }
    await goToStep("session");
  };

  const runCountdown = async () => {
    if (countdownTimerRef.current) {
      return;
    }
    await new Promise<void>((resolve) => {
      let value = 3;
      setCountdown(value);
      countdownTimerRef.current = window.setInterval(() => {
        value -= 1;
        if (value <= 0) {
          if (countdownTimerRef.current) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          setCountdown(null);
          resolve();
          return;
        }
        setCountdown(value);
      }, 1000);
    });
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return null;
    }
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const ratio =
      templateImage && templateImage.width && templateImage.height
        ? templateImage.width / templateImage.height
        : 3 / 4;
    let targetWidth = width;
    let targetHeight = Math.round(targetWidth / ratio);
    if (targetHeight > height) {
      targetHeight = height;
      targetWidth = Math.round(targetHeight * ratio);
    }
    const sourceX = Math.round((width - targetWidth) / 2);
    const sourceY = Math.round((height - targetHeight) / 2);
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.filter = "none";
    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      targetWidth,
      targetHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );
    return canvas.toDataURL("image/png");
  };

  const startPhotoSession = async () => {
    if (isCapturing) {
      return;
    }
    setCapturedPhotos([]);
    setIsCapturing(true);
    const shots = selectedTemplate?.slots ?? 3;
    const results: string[] = [];
    for (let index = 0; index < shots; index += 1) {
      await runCountdown();
      const frame = await captureFrame();
      if (frame) {
        results.push(frame);
        setCapturedPhotos([...results]);
      }
    }
    setIsCapturing(false);
    await goToStep("filter");
  };

  const generateFinalImage = async () => {
    const basePhoto = capturedPhotos[0];
    if (!basePhoto) {
      return;
    }
    const baseImage = await loadImage(basePhoto);
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.filter = selectedFilter;
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    if (templateImage) {
      ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
    }
    const dataUrl = canvas.toDataURL("image/png");
    setFinalPreviewUrl(dataUrl);
    await uploadFinalImage(dataUrl);
  };

  const uploadFinalImage = async (dataUrl: string) => {
    if (!supabase) {
      setStorageUrl(dataUrl);
      dispatch({ type: "SET_PHOTO_URL", url: dataUrl });
      await goToStep("delivery");
      return;
    }
    setIsUploading(true);
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const filePath = state.transaction.id
      ? `transactions/${state.transaction.id}/final.png`
      : `transactions/${crypto.randomUUID()}.png`;
    const { error } = await supabase.storage
      .from("captures")
      .upload(filePath, blob, { contentType: "image/png", upsert: true });
    if (error) {
      setStorageUrl(dataUrl);
      dispatch({ type: "SET_PHOTO_URL", url: dataUrl });
      setIsUploading(false);
      await goToStep("delivery");
      return;
    }
    const publicUrl = supabase.storage
      .from("captures")
      .getPublicUrl(filePath).data.publicUrl;
    setStorageUrl(publicUrl || dataUrl);
    dispatch({ type: "SET_PHOTO_URL", url: publicUrl || dataUrl });
    if (supabase && state.transaction.id) {
      await supabase
        .from("transactions")
        .update({ photo_url: publicUrl || dataUrl })
        .eq("id", state.transaction.id);
    }
    setIsUploading(false);
    await goToStep("delivery");
  };

  const handleFinish = async () => {
    await goToStep("finish");
  };

  const paymentOptions = paymentMethods.filter((method) => method.type === "cash");
  const nonCashAvailable = nonCashMethods.length > 0;
  const totalPrice =
    state.transaction.total_price ||
    pricing.basePrice + state.transaction.quantity * pricing.perPrintPrice;
  const qrValue = state.transaction.id
    ? `qris:${state.transaction.id}`
    : "qris:preview";
  const photoUrl = storageUrl ?? finalPreviewUrl ?? "";

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-6">
      <header className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Booth Transaction Flow
        </span>
        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
          {stepLabel}
        </h1>
        <p className="text-sm text-muted-foreground">
          {supabaseState.error ?? "Touch-friendly, multi-screen photobooth experience."}
        </p>
      </header>

      <AnimatePresence mode="wait">
        {state.step === "idle" && (
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
              <Button size="lg" onClick={handleStart}>
                Tap to Start
              </Button>
              <p className="max-w-md text-sm text-muted-foreground">
                Sentuh layar untuk memulai transaksi photobooth.
              </p>
            </motion.div>
          </motion.section>
        )}

        {state.step === "payment" && (
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
                      handleSelectPayment(
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
                    onClick={async () => {
                      await goToStep("noncash");
                    }}
                  >
                    Pilih Non-Tunai
                  </Button>
                </CardContent>
              </Card>
            </div>
            <Button variant="ghost" onClick={() => goToStep("idle")}>
              <ChevronLeft className="h-4 w-4" />
              Kembali
            </Button>
          </motion.section>
        )}

        {state.step === "noncash" && (
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
                    <Button size="lg" onClick={() => handleSelectNonCash(method)}>
                      Pilih
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => goToStep("payment")}>
                <ChevronLeft className="h-4 w-4" />
                Kembali
              </Button>
            </div>
          </motion.section>
        )}

        {state.step === "template" && (
          <motion.section
            key="template"
            className="flex min-h-[calc(100vh-14rem)] flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Template belum tersedia.
                  </CardContent>
                </Card>
              )}
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`flex flex-col gap-3 rounded-2xl border p-4 text-left transition ${
                    selectedTemplate?.id === template.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl">
                    <Image
                      src={template.url}
                      alt={template.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <span className="text-sm font-semibold">{template.name}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => goToStep("payment")}>
                <ChevronLeft className="h-4 w-4" />
                Kembali
              </Button>
              <Button size="lg" onClick={handleGoToQuantity} disabled={!selectedTemplate}>
                Lanjutkan
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.section>
        )}

        {state.step === "quantity" && (
          <motion.section
            key="quantity"
            className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle>Jumlah Cetak</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-3">
                  {quantityOptions.map((option) => (
                    <Button
                      key={option}
                      size="lg"
                      variant={
                        state.transaction.quantity === option ? "default" : "outline"
                      }
                      onClick={() => handleQuantitySelect(option)}
                    >
                      {option} Lembar
                    </Button>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Harga Dasar: Rp {pricing.basePrice.toLocaleString("id-ID")}
                  <br />
                  Harga Per Lembar: Rp {pricing.perPrintPrice.toLocaleString("id-ID")}
                  <br />
                  Total: Rp {totalPrice.toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
            <Button variant="ghost" onClick={() => goToStep("template")}>
              <ChevronLeft className="h-4 w-4" />
              Kembali
            </Button>
          </motion.section>
        )}

        {state.step === "qris" && (
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
                <Button size="lg" onClick={handleSimulatePaid}>
                  Simulasi Bayar Berhasil
                </Button>
              </CardContent>
            </Card>
            <Button variant="ghost" onClick={() => goToStep("quantity")}>
              <ChevronLeft className="h-4 w-4" />
              Kembali
            </Button>
          </motion.section>
        )}

        {state.step === "session" && (
          <motion.section
            key="session"
            className="flex min-h-[calc(100vh-14rem)] flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="relative mx-auto aspect-[3/4] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-black">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    playsInline
                    muted
                  />
                  {selectedTemplate?.url && (
                    <Image
                      src={selectedTemplate.url}
                      alt={selectedTemplate.name}
                      fill
                      unoptimized
                      className="pointer-events-none object-cover"
                    />
                  )}
                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-6xl font-semibold text-white">
                      {countdown}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {capturedPhotos.map((photo, index) => (
                <div
                  key={`${photo}-${index}`}
                  className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border"
                >
                  <Image src={photo} alt={`Capture ${index + 1}`} fill unoptimized />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => goToStep("quantity")}>
                <ChevronLeft className="h-4 w-4" />
                Kembali
              </Button>
              <Button size="lg" onClick={startPhotoSession} disabled={isCapturing}>
                <Camera className="h-4 w-4" />
                {isCapturing ? "Mengambil Foto..." : "Mulai Sesi Foto"}
              </Button>
            </div>
          </motion.section>
        )}

        {state.step === "filter" && (
          <motion.section
            key="filter"
            className="flex min-h-[calc(100vh-14rem)] flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative aspect-[3/4] w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-black">
              {capturedPhotos[0] && (
                <Image
                  src={capturedPhotos[0]}
                  alt="Preview"
                  fill
                  unoptimized
                  className="object-cover"
                  style={{ filter: selectedFilter }}
                />
              )}
              {selectedTemplate?.url && (
                <Image
                  src={selectedTemplate.url}
                  alt={selectedTemplate.name}
                  fill
                  unoptimized
                  className="pointer-events-none object-cover"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {filters.map((filter) => (
                <Button
                  key={filter.id}
                  size="lg"
                  variant={selectedFilter === filter.value ? "default" : "outline"}
                  onClick={() => setSelectedFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => goToStep("session")}>
                <ChevronLeft className="h-4 w-4" />
                Kembali
              </Button>
              <Button size="lg" onClick={generateFinalImage}>
                Lanjutkan
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.section>
        )}

        {state.step === "delivery" && (
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
                  {photoUrl ? (
                    photoUrl.startsWith("data:") ? (
                      <div className="text-sm text-muted-foreground">
                        QR tidak tersedia untuk file lokal. Unggah selesai dulu.
                      </div>
                    ) : (
                      <QRCodeCanvas value={photoUrl} size={180} />
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
                    value={state.transaction.email ?? ""}
                    onChange={(event) =>
                      dispatch({ type: "SET_EMAIL", email: event.target.value })
                    }
                  />
                  <Button onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    Cetak Foto
                  </Button>
                  <Button variant="secondary" onClick={handleFinish}>
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
        )}

        {state.step === "finish" && (
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
            <Button onClick={resetFlow}>Kembali ke Idle</Button>
          </motion.section>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
