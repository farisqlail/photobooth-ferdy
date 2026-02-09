"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Sparkles, Cloud, Ticket } from "lucide-react";

import {
  PaymentMethod,
  Step,
  TemplateOption,
} from "../../components/features/booth/types";
import { filters } from "../../components/features/booth/constants";
import { createGif } from "@/lib/gif-utils";
import { mergeVideos } from "@/lib/video-utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { PaymentStep } from "../../components/features/booth/payment-step";
import { NonCashStep } from "../../components/features/booth/non-cash-step";
import { TemplateStep } from "../../components/features/booth/template-step";
import { QuantityStep } from "../../components/features/booth/quantity-step";
import { QrisStep } from "../../components/features/booth/qris-step";
import { SessionStep } from "../../components/features/booth/session-step";
import { FilterStep } from "../../components/features/booth/filter-step";
import { DeliveryStep } from "../../components/features/booth/delivery-step";
import { FinishStep } from "../../components/features/booth/finish-step";

import { useBoothState } from "../../components/features/booth/hooks/useBoothState";
import { useBoothData } from "../../components/features/booth/hooks/useBoothData";
import { usePhotoSession } from "../../components/features/booth/hooks/usePhotoSession";
import { useImageProcessing } from "../../components/features/booth/hooks/useImageProcessing";
import { loadImage } from "../../components/features/booth/utils";

function BoothContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoStart = searchParams.get("autoStart");
  
  // --- Hooks ---
  const { state, dispatch } = useBoothState();
  const {
    supabase,
    paymentMethods,
    nonCashMethods,
    pricing,
    templates,
    loadPaymentMethods,
    loadPricing,
    loadTemplates,
    createTransaction,
    updateTransactionStatus,
  } = useBoothData();
  const {
    previewVideoRef,
    capturedPhotos,
    capturedVideos,
    isCapturing,
    countdown,
    startCamera,
    stopCamera,
    onPreviewVideoMount,
    startPhotoSession,
    retakePhoto,
    resetSession,
  } = usePhotoSession();
  const {
    finalPreviewUrl,
    storageUrl,
    isUploading,
    generateFinalImage,
    resetImages,
  } = useImageProcessing(supabase);

  // --- Local State ---
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(filters[0].value);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [verifyingVoucher, setVerifyingVoucher] = useState(false);

  const [isAutoStarting, setIsAutoStarting] = useState(false);

  // --- Asset Generation State ---
  const [gifDownloadUrl, setGifDownloadUrl] = useState<string | null>(null);
  const [videoDownloadUrl, setVideoDownloadUrl] = useState<string | null>(null);
  const [gifUploadStatus, setGifUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [videoUploadStatus, setVideoUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [gifUrl, setGifUrl] = useState<string | null>(null); // Local blob url for GIF

  // --- Refs ---
  const finishTimerRef = useRef<number | null>(null);

  // --- Effects ---

  // --- Helpers ---

  const clearFinishTimer = useCallback(() => {
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, []);

  const resetFlow = useCallback(() => {
    clearFinishTimer();
    dispatch({ type: "RESET" });
    setSelectedTemplate(null);
    setTemplateImage(null);
    setRetakeIndex(null);
    setSelectedFilter(filters[0].value);
    setSessionTimeLeft(null);
    resetSession();
    resetImages();
    // Reset assets
    setGifDownloadUrl(null);
    setVideoDownloadUrl(null);
    setGifUploadStatus('idle');
    setVideoUploadStatus('idle');
    setGifUrl(null);
    // Note: We don't clear templates/payment methods data as they are global/cached
  }, [dispatch, resetSession, resetImages, clearFinishTimer]);

  const goToStep = async (step: Step) => {
    clearFinishTimer();
    if (step !== "session") {
      stopCamera();
    }
    dispatch({ type: "SET_STEP", step });
  };

  // --- Effects ---

  // Trigger asset generation when we have photos and are past the session step
  useEffect(() => {
    // Only start if we have photos/videos, transaction ID, and we are not in session step (so capturing is done)
    // We can start as early as "filter" step or "delivery" step
    const canStart = (state.step === "filter" || state.step === "delivery") && 
                     capturedPhotos.length > 0 && 
                     state.transaction?.id;

    if (!canStart || !supabase) return;

    // 1. Video Upload
    if (capturedVideos.length > 0 && videoUploadStatus === 'idle') {
        setVideoUploadStatus('uploading');
        const uploadVideo = async () => {
            try {
                // Check if we need to merge locally
                const mergedUrl = await mergeVideos(capturedVideos); // This returns blob url
                const response = await fetch(mergedUrl);
                const blob = await response.blob();
                
                const filePath = `transactions/${state.transaction.id}/video.webm`;
                const { error } = await supabase.storage.from("captures").upload(filePath, blob, { contentType: "video/webm", upsert: true });
                
                if (!error) {
                    const { data } = await supabase.storage.from("captures").createSignedUrl(filePath, 3600 * 24 * 7); // 1 week
                    if (data?.signedUrl) {
                        setVideoDownloadUrl(data.signedUrl);
                        setVideoUploadStatus('success');
                    } else {
                        setVideoUploadStatus('error');
                    }
                } else {
                    console.error("Video storage upload failed", error);
                    setVideoUploadStatus('error');
                }
            } catch (e) {
                console.error("Background video merge/upload failed", e);
                setVideoUploadStatus('error');
            }
        };
        uploadVideo();
    }

    // 2. GIF Generation and Upload
    if (gifUploadStatus === 'idle') {
        setGifUploadStatus('uploading');
        const uploadGif = async () => {
             try {
                let currentGifUrl = gifUrl;
                
                // If gifUrl not ready yet, try to generate it now
                if (!currentGifUrl) {
                   try {
                     currentGifUrl = await createGif(capturedPhotos);
                     setGifUrl(currentGifUrl);
                   } catch (err) {
                     console.error("JIT GIF generation failed", err);
                     setGifUploadStatus('error');
                   }
                }

                if (currentGifUrl) {
                    const response = await fetch(currentGifUrl);
                    const blob = await response.blob();
                    
                    const filePath = `transactions/${state.transaction.id}/animation.gif`;
                    const { error } = await supabase.storage.from("captures").upload(filePath, blob, { contentType: "image/gif", upsert: true });
                    
                    if (!error) {
                        const { data } = await supabase.storage.from("captures").createSignedUrl(filePath, 3600 * 24 * 7); // 1 week
                        if (data?.signedUrl) {
                            setGifDownloadUrl(data.signedUrl);
                            setGifUploadStatus('success');
                        } else {
                            setGifUploadStatus('error');
                        }
                    } else {
                        console.error("GIF storage upload failed", error);
                        setGifUploadStatus('error');
                    }
                } else {
                    setGifUploadStatus('error');
                }
             } catch (e) {
                 console.error("GIF upload failed", e);
                 setGifUploadStatus('error');
             }
        };
        uploadGif();
    }
  }, [state.step, capturedPhotos, capturedVideos, state.transaction?.id, supabase, videoUploadStatus, gifUploadStatus, gifUrl]);

  // Handle finish timer
  // Logic moved to FinishStep component
  /*
  useEffect(() => {
    if (state.step === "finish") {
      finishTimerRef.current = window.setTimeout(() => {
        resetFlow();
      }, 10000);
    }
    return () => {
      if (finishTimerRef.current) {
        clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    };
  }, [state.step, resetFlow]);
  */

  // Handle session countdown
  useEffect(() => {
    if (state.transaction?.payment_status === "paid" && sessionTimeLeft === null) {
      setSessionTimeLeft(pricing.sessionCountdown);
    }
  }, [state.transaction?.payment_status, pricing.sessionCountdown, sessionTimeLeft]);

  useEffect(() => {
    if (sessionTimeLeft === null) return;

    if (sessionTimeLeft <= 0) {
      resetFlow();
      router.push("/");
      return;
    }

    const timer = setInterval(() => {
      setSessionTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionTimeLeft, resetFlow, router]);

  // Load template image when selected template changes
  useEffect(() => {
    if (
      (state.step === "session" || state.step === "filter") &&
      selectedTemplate &&
      !templateImage
    ) {
      loadImage(selectedTemplate.url)
        .then(setTemplateImage)
        .catch((e) => console.error("Failed to reload template image", e));
    }
  }, [state.step, selectedTemplate, templateImage]);

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

  // --- Handlers ---

  const handleStart = useCallback(async () => {
    console.log("[handleStart] Triggered");
    
    // If triggered by autoStart, set loading state
    if (autoStart === "true") {
        setIsAutoStarting(true);
    }
    
    try {
      // Parallelize data fetching to improve loading time
      const [_, methods, templates] = await Promise.all([
        loadPricing(),
        loadPaymentMethods(),
        loadTemplates()
      ]);

      console.log("[handleStart] Payment methods loaded:", methods?.length);
      console.log("[handleStart] Templates loaded:", templates?.length);
      
      // Check if "Event" is the ONLY active payment method
      // Note: methods can be undefined if something fails, so we check for array existence
      if (methods && methods.length === 1 && methods[0].name === "Event") {
        console.log("[handleStart] Auto-selecting 'Event' payment method");
        dispatch({ type: "SET_PAYMENT_METHOD", method: methods[0].name });
        
        if (templates && templates.length > 0) {
          const first = templates[0];
          setSelectedTemplate(first);
          dispatch({ type: "SET_TEMPLATE", templateId: first.id });
          loadImage(first.url).then(setTemplateImage).catch(e => console.error("Failed to preload template image", e));
        }
        console.log("[handleStart] Going to step: template");
        await goToStep("template");
        return;
      }

      if (templates && templates.length > 0) {
        const first = templates[0];
        setSelectedTemplate(first);
        dispatch({ type: "SET_TEMPLATE", templateId: first.id });
        loadImage(first.url).then(setTemplateImage).catch(e => console.error("Failed to preload template image", e));
      }
      console.log("[handleStart] Going to step: template (default flow)");
      await goToStep("template");
    } catch (error) {
        console.error("[handleStart] Error starting session:", error);
    } finally {
        setIsAutoStarting(false);
    }
  }, [dispatch, loadPricing, loadPaymentMethods, loadTemplates, goToStep, setSelectedTemplate, setTemplateImage, autoStart]);

  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (autoStart === "true" && state.step === "idle" && !hasAutoStarted.current) {
      console.log("[useEffect] Auto-start triggered");
      hasAutoStarted.current = true;
      handleStart();
    }
  }, [autoStart, state.step, handleStart]);

  // If auto-starting, show a fake loading screen that mimics the Home page
  if (isAutoStarting) {
    return (
      <div className="relative flex w-full max-w-2xl flex-col items-center overflow-hidden rounded-xl bg-white p-8 shadow-2xl">
        
        {/* Checkered Frame */}
        <div className="relative mb-8 flex aspect-[4/3] w-full max-w-md items-center justify-center overflow-hidden border-[12px] border-[#333] bg-sky-200 p-1 shadow-inner">
           {/* Decorative Dots Pattern on Border */}
           <div className="absolute inset-0 border-[4px] border-dashed border-white/30 pointer-events-none"></div>
           
           {/* Illustration */}
           <div className="relative h-full w-full overflow-hidden bg-[#87CEEB]">
             {/* Clouds */}
             <Cloud className="absolute left-10 top-10 h-16 w-16 text-white opacity-90" fill="white" />
             <Cloud className="absolute right-20 top-16 h-12 w-12 text-white opacity-80" fill="white" />
             <Cloud className="absolute left-1/2 top-8 h-20 w-20 -translate-x-1/2 text-white" fill="white" />
             
             {/* Hills */}
             <div className="absolute bottom-0 h-1/2 w-full">
               <div className="absolute bottom-0 left-0 h-full w-[120%] -translate-x-10 rounded-tr-[100%] bg-[#7CB342]" />
               <div className="absolute bottom-0 right-0 h-[80%] w-[120%] translate-x-10 rounded-tl-[100%] bg-[#558B2F]" />
             </div>
           </div>
        </div>

        {/* Retro Logo */}
        <h1 className="mb-8 text-6xl font-black tracking-tighter text-white sm:text-7xl"
            style={{
              textShadow: `
                4px 4px 0px #00AEEF,
                8px 8px 0px #FFF200,
                12px 12px 0px #F7941D,
                16px 16px 0px #EC008C
              `,
              WebkitTextStroke: "2px black"
            }}>
          BOOTHLAB
        </h1>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center gap-4 h-14 justify-center">
           <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
           <p className="text-sm font-semibold text-muted-foreground">Memulai sesi...</p>
        </div>

      </div>
    );
  }

  const handleSelectPayment = async (method: PaymentMethod) => {
    if (method.type === 'cash') {
       setIsVoucherDialogOpen(true);
       return;
    }

    dispatch({ type: "SET_PAYMENT_METHOD", method: method.name });
    
    const transactionId = await createTransaction(
      state.transaction.total_price, 
      method.name, 
      selectedTemplate?.id
    );
    
    if (transactionId) {
      dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
    }

    await goToStep("qris");
  };

  const handleVoucherSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!voucherCode.trim()) return;

    setVerifyingVoucher(true);
    try {
      const res = await fetch("/api/booth/redeem-voucher", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ code: voucherCode }),
      });
      const data = await res.json();
      
      if (res.ok) {
         setIsVoucherDialogOpen(false);
         setVoucherCode(""); 
         
         const cashMethod = paymentMethods.find(m => m.type === 'cash');
         const methodName = cashMethod?.name || "Cash";
         dispatch({ type: "SET_PAYMENT_METHOD", method: methodName });
         
         const transactionId = await createTransaction(
           state.transaction.total_price, 
           methodName, 
           selectedTemplate?.id
         );
         
         if (transactionId) {
           dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
           await updateTransactionStatus(transactionId, "paid");
         }

         dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
         await goToStep("session");
      } else {
         // Use native alert or toast if available. Since we don't have toast imported here yet (or context), alert is fine.
         alert(data.error || "Invalid voucher");
      }
    } catch (e) {
      console.error(e);
      alert("Error verifying voucher");
    } finally {
      setVerifyingVoucher(false);
    }
  };

  const handleSelectNonCash = async (method: PaymentMethod) => {
    dispatch({ type: "SET_PAYMENT_METHOD", method: method.name });
    
    const transactionId = await createTransaction(
      state.transaction.total_price, 
      method.name, 
      selectedTemplate?.id
    );
    
    if (transactionId) {
      dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
    }

    await goToStep("qris");
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

    // Check if payment method is "Event"
    if (state.transaction.payment_method?.toLowerCase() === "event") {
        // Auto-select quantity 1 and skip quantity step
        dispatch({ type: "SET_QUANTITY", quantity: 1 });
        const total = 0; // Free for event
        dispatch({ type: "SET_TOTAL_PRICE", total });
        
        const transactionId = await createTransaction(
          total, 
          state.transaction.payment_method, 
          selectedTemplate?.id
        );
        
        if (transactionId) {
          dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
          await updateTransactionStatus(transactionId, "paid");
        }

        dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
        await goToStep("session");
        return;
    }

    await goToStep("quantity");
  };

  const handleQuantitySelect = async (quantity: number) => {
    dispatch({ type: "SET_QUANTITY", quantity });
    const total = pricing.basePrice + quantity * pricing.perPrintPrice;
    dispatch({ type: "SET_TOTAL_PRICE", total });
    
    // Check if Event mode is active
    if (state.transaction.payment_method?.toLowerCase() === "event") {
       const transactionId = await createTransaction(
          total, 
          state.transaction.payment_method, 
          selectedTemplate?.id
       );
        
       if (transactionId) {
          dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
          await updateTransactionStatus(transactionId, "paid");
       }

       dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
       await goToStep("session");
       return;
    }

    await goToStep("payment");
  };

  const handleSimulatePaid = async () => {
    dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
    if (state.transaction.id) {
      await updateTransactionStatus(state.transaction.id, "paid");
    }
    await goToStep("session");
  };

  const handleRetakePhotoRequest = (index: number) => {
    setRetakeIndex(index);
    // Reset assets on retake as photos will change
    setGifDownloadUrl(null);
    setVideoDownloadUrl(null);
    setGifUploadStatus('idle');
    setVideoUploadStatus('idle');
    setGifUrl(null);
    goToStep("session");
  };

  const handleCancelRetake = () => {
    setRetakeIndex(null);
    goToStep("filter");
  };

  const handleStartPhotoSession = async () => {
    if (retakeIndex !== null) {
      await retakePhoto(retakeIndex, selectedTemplate, templateImage, async () => {
        setRetakeIndex(null);
        // Stay on session step to allow review
      });
    } else {
      await startPhotoSession(selectedTemplate, templateImage, async () => {
        // Stay on session step to allow review
      });
    }
  };

  const handleGenerateFinalImage = async () => {
    try {
      const result = await generateFinalImage({
        capturedPhotos,
        selectedTemplate,
        templateImage,
        selectedFilter,
        transactionId: state.transaction.id,
      });
      
      if (result) {
          if (result.uploadedUrl) {
               dispatch({ type: "SET_PHOTO_URL", url: result.uploadedUrl });
          } else {
               dispatch({ type: "SET_PHOTO_URL", url: result.finalUrl });
          }
        await goToStep("delivery");
      }
    } catch (error) {
      console.error("Error generating final image:", error);
      // Optional: Add UI feedback for error here
    }
  };

  const handleSetEmail = (email: string) => {
    dispatch({ type: "SET_EMAIL", email });
  };

  return (
    <div className="relative flex w-full max-w-7xl h-[90vh] flex-col overflow-hidden">
      {/* Header */}
      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6 relative">
        <>
          <AnimatePresence mode="wait">
          {state.step === "payment" && (
                <PaymentStep
                  key="payment"
                  paymentOptions={paymentMethods}
                  nonCashAvailable={nonCashMethods.length > 0}
                  onSelectPayment={handleSelectPayment}
                  onGoToStep={goToStep}
                />
              )}

              {state.step === "noncash" && (
                <NonCashStep
                  key="noncash"
                  nonCashMethods={nonCashMethods}
                  onSelectNonCash={handleSelectNonCash}
                  onGoToStep={goToStep}
                />
              )}

              {state.step === "template" && (
                <TemplateStep
                  key="template"
                  templates={templates}
                  pricing={pricing}
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={handleTemplateSelect}
                  onGoToStep={goToStep}
                  onGoToQuantity={handleGoToQuantity}
                />
              )}

              {state.step === "quantity" && (
                <QuantityStep
                  key="quantity"
                  quantity={state.transaction.quantity}
                  pricing={pricing}
                  onSelectQuantity={handleQuantitySelect}
                  onGoToStep={goToStep}
                />
              )}

              {state.step === "qris" && (
                <QrisStep
                  key="qris"
                  transaction={state.transaction}
                  onSimulatePaid={handleSimulatePaid}
                  onGoToStep={goToStep}
                />
              )}

              {state.step === "session" && (
                <SessionStep
                  key="session"
                  capturedPhotos={capturedPhotos}
                  selectedTemplate={selectedTemplate}
                  onPreviewVideoMount={onPreviewVideoMount}
                  countdown={countdown}
                  startPhotoSession={handleStartPhotoSession}
                  isCapturing={isCapturing}
                  onGoToStep={goToStep}
                  retakeIndex={retakeIndex}
                  onCancelRetake={handleCancelRetake}
                  sessionTimeLeft={sessionTimeLeft}
                  onRetakePhoto={handleRetakePhotoRequest}
                />
              )}

              {state.step === "filter" && (
                <FilterStep
                  key="filter"
                  capturedPhotos={capturedPhotos}
                  selectedTemplate={selectedTemplate}
                  templateImage={templateImage}
                  selectedFilter={selectedFilter}
                  onSelectFilter={setSelectedFilter}
                  onGoToStep={goToStep}
                  onGenerateFinalImage={handleGenerateFinalImage}
                  onRetakePhoto={handleRetakePhotoRequest}
                  sessionTimeLeft={sessionTimeLeft}
                  isProcessing={isUploading}
                />
              )}

              {state.step === "delivery" && (
                <DeliveryStep
                  key="delivery"
                  finalPreviewUrl={finalPreviewUrl}
                  storageUrl={storageUrl}
                  isUploading={isUploading}
                  transaction={state.transaction}
                  onSetEmail={handleSetEmail}
                  onGoToStep={goToStep}
                  capturedPhotos={capturedPhotos}
                  capturedVideos={capturedVideos}
                  supabase={supabase}
                  sessionTimeLeft={sessionTimeLeft}
                  gifDownloadUrl={gifDownloadUrl}
                  videoDownloadUrl={videoDownloadUrl}
                  gifUploadStatus={gifUploadStatus}
                  videoUploadStatus={videoUploadStatus}
                />
              )}

              {state.step === "finish" && (
                <FinishStep key="finish" onReset={resetFlow} />
              )}
            </AnimatePresence>

            <Dialog open={isVoucherDialogOpen} onOpenChange={setIsVoucherDialogOpen}>
              <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none p-8 shadow-2xl bg-white/95 backdrop-blur-xl">
                <DialogHeader className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 mb-2">
                    <Ticket className="h-10 w-10 text-black" />
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black tracking-tight text-black">
                      Enter Voucher
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 font-medium text-base mt-2">
                      Masukkan kode voucher yang diberikan operator
                    </DialogDescription>
                  </div>
                </DialogHeader>
                <form onSubmit={handleVoucherSubmit} className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="XXXX-XXXX"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      autoFocus
                      className="h-20 text-center text-3xl font-black tracking-widest uppercase rounded-2xl border-2 border-zinc-200 bg-zinc-50 text-black placeholder:text-zinc-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsVoucherDialogOpen(false)}
                      className="h-14 rounded-full border-2 text-base font-bold text-black hover:bg-zinc-100"
                    >
                      Batal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={verifyingVoucher || !voucherCode}
                      className="h-14 rounded-full bg-black text-base font-bold text-white hover:bg-zinc-800 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                    >
                      {verifyingVoucher ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Verifying...
                        </span>
                      ) : (
                        "Gunakan Voucher"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>
        </div>
      </div>
  );
}

export default function BoothPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[90vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="text-sm font-semibold text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <BoothContent />
    </Suspense>
  );
}
