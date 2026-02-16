import { useCallback, useRef, useState } from "react";
import { TemplateOption } from "../types";

export function usePhotoSession() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [capturedVideos, setCapturedVideos] = useState<string[]>([]); // New state for live photos (videos)
  const [isCapturing, setIsCapturing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current?.active) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        await previewVideoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  }, []);

  const onPreviewVideoMount = useCallback(
    (node: HTMLVideoElement | null) => {
      previewVideoRef.current = node;
      if (node) {
        if (streamRef.current?.active) {
          node.srcObject = streamRef.current;
          node.play().catch(console.error);
        } else {
          startCamera();
        }
      }
    },
    [startCamera]
  );

  const runCountdown = async () => {
    if (countdownTimerRef.current) {
      return;
    }
    await new Promise<void>((resolve) => {
      let value = 5;
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

  const captureFrame = async (targetRatio?: number, templateImage?: HTMLImageElement | null) => {
    const video = previewVideoRef.current || videoRef.current;
    // We create a temporary canvas if the ref isn't available or just use the ref
    // But we need a canvas to draw. In the original code, canvasRef was used.
    // Let's create a temporary canvas if needed or assume canvasRef is bound to a hidden canvas?
    // In BoothPage, canvasRef is useRef<HTMLCanvasElement>(null).
    // Let's use a document.createElement('canvas') if we don't want to rely on a DOM element being rendered.
    const canvas = document.createElement('canvas'); 
    
    if (!video) {
      return null;
    }
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const ratio = targetRatio ?? (
      templateImage && templateImage.naturalWidth && templateImage.naturalHeight
        ? templateImage.naturalWidth / templateImage.naturalHeight
        : 3 / 4
    );
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

  const startRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    const options = { mimeType: "video/webm" };
    try {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.start();
    } catch (e) {
      console.error("Failed to start recording", e);
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        resolve(url);
      };
      mediaRecorderRef.current.stop();
    });
  };

  const retakePhoto = async (
    index: number,
    selectedTemplate: TemplateOption | null, 
    templateImage: HTMLImageElement | null,
    onComplete: () => Promise<void>
  ) => {
    if (isCapturing) return;
    setIsCapturing(true);

    startRecording();
    
    await runCountdown();

    let ratio = 3 / 4;
    const slot = selectedTemplate?.slots_config?.[index];
    if (slot && slot.width && slot.height) {
      ratio = slot.width / slot.height;
    } else if (selectedTemplate?.photo_width && selectedTemplate?.photo_height) {
      ratio = selectedTemplate.photo_width / selectedTemplate.photo_height;
    } else if (templateImage && templateImage.naturalWidth && templateImage.naturalHeight) {
      ratio = templateImage.naturalWidth / templateImage.naturalHeight;
    }

    const frame = await captureFrame(ratio, templateImage);
    
    await new Promise(r => setTimeout(r, 1000));
    
    const videoUrl = await stopRecording();

    if (frame) {
      setCapturedPhotos(prev => {
        const next = [...prev];
        next[index] = frame;
        return next;
      });
    }
    if (videoUrl) {
      setCapturedVideos(prev => {
        const next = [...prev];
        next[index] = videoUrl;
        return next;
      });
    }

    setIsCapturing(false);
    await onComplete();
  };

  const startPhotoSession = async (
    selectedTemplate: TemplateOption | null, 
    templateImage: HTMLImageElement | null,
    onComplete: () => Promise<void>
  ) => {
    if (isCapturing) {
      return;
    }
    setCapturedPhotos([]);
    setCapturedVideos([]);
    setIsCapturing(true);
    const shots = selectedTemplate?.slots ?? 3;
    const results: string[] = [];
    const videoResults: string[] = [];

    for (let index = 0; index < shots; index += 1) {
      // Start recording before countdown finishes (approx 3 seconds of video)
      startRecording();
      
      await runCountdown();

      let ratio = 3 / 4;
      const slot = selectedTemplate?.slots_config?.[index];
      if (slot && slot.width && slot.height) {
        ratio = slot.width / slot.height;
      } else if (selectedTemplate?.photo_width && selectedTemplate?.photo_height) {
        ratio = selectedTemplate.photo_width / selectedTemplate.photo_height;
      } else if (templateImage && templateImage.naturalWidth && templateImage.naturalHeight) {
        ratio = templateImage.naturalWidth / templateImage.naturalHeight;
      }

      const frame = await captureFrame(ratio, templateImage);
      
      // Stop recording immediately after capture
      // We might want to wait a split second to capture "after" movement too?
      // Apple Live Photos capture 1.5s after.
      // Let's wait 1 second to capture post-pose.
      await new Promise(r => setTimeout(r, 1000));
      
      const videoUrl = await stopRecording();

      if (frame) {
        results.push(frame);
        setCapturedPhotos([...results]);
      }
      if (videoUrl) {
        videoResults.push(videoUrl);
        setCapturedVideos([...videoResults]);
      }
    }
    setIsCapturing(false);
    await onComplete();
  };

  const resetSession = () => {
    setCapturedPhotos([]);
    setCapturedVideos([]);
    setCountdown(null);
    setIsCapturing(false);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  return {
    videoRef,
    previewVideoRef,
    streamRef,
    canvasRef,
    countdown,
    capturedPhotos,
    capturedVideos,
    isCapturing,
    setCapturedPhotos,
    startCamera,
    stopCamera,
    onPreviewVideoMount,
    startPhotoSession,
    retakePhoto,
    resetSession,
  };
}
