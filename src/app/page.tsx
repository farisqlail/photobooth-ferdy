"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cloud, CameraOff } from "lucide-react";
import { useBoothData } from "@/components/features/booth/hooks/useBoothData";
import Image from "next/image";

export default function Home() {
  const { pricing, loadPricing } = useBoothData();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setCameraError(false);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
             width: { ideal: 1280 },
             height: { ideal: 720 },
             aspectRatio: { ideal: 4/3 }
          },
          audio: false,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (e) {
            console.error("Error playing video:", e);
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraError(true);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-gradient-to-br from-orange-400 via-gray-200 to-blue-400 font-sans">
      {/* Top Color Strip */}
      <div className="flex h-4 w-full">
        <div className="h-full w-1/4 bg-[#00AEEF]" />
        <div className="h-full w-1/4 bg-[#FFF200]" />
        <div className="h-full w-1/4 bg-[#F7941D]" />
        <div className="h-full w-1/4 bg-[#EC008C]" />
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="relative flex w-full max-w-2xl flex-col items-center overflow-hidden rounded-xl bg-white p-8 shadow-2xl">
          
          {/* Checkered Frame with Live Camera */}
          <div className="relative mb-8 flex aspect-[4/3] w-full max-w-md items-center justify-center overflow-hidden border-[12px] border-[#333] bg-black p-1 shadow-inner">
             {/* Decorative Dots Pattern on Border (Simulated with dashed border) */}
             <div className="absolute inset-0 border-[4px] border-dashed border-white/30 pointer-events-none z-10"></div>
             
             <div className="relative h-full w-full overflow-hidden bg-black">
               {cameraError ? (
                 <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900 text-white">
                   <CameraOff className="h-16 w-16 opacity-50 mb-2" />
                   <p className="text-sm opacity-70">Camera access failed</p>
                 </div>
               ) : (
                 <video 
                   ref={videoRef}
                   autoPlay 
                   playsInline 
                   muted
                   onLoadedMetadata={() => videoRef.current?.play()}
                   className="h-full w-full object-cover transform scale-x-[-1]" 
                 />
               )}
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
            PESONALAB
          </h1>

          {/* Start Button */}
          <Button 
            asChild 
            className="h-14 w-48 rounded-2xl bg-black text-xl font-bold text-white shadow-xl transition-transform hover:scale-105 hover:bg-gray-900"
          >
            <Link href="/booth?autoStart=true">
              Start
            </Link>
          </Button>

        </div>
      </main>

      {/* Footer */}
      <footer className="flex w-full flex-col items-center pb-4">
        <p className="mb-2 text-sm font-semibold text-gray-800 drop-shadow-sm">
          powered by <span className="font-bold">PESONALAB</span>
        </p>
        
        {/* Bottom Color Strip */}
        <div className="flex h-4 w-full">
          <div className="h-full w-1/4 bg-[#00AEEF]" />
          <div className="h-full w-1/4 bg-[#FFF200]" />
          <div className="h-full w-1/4 bg-[#F7941D]" />
          <div className="h-full w-1/4 bg-[#EC008C]" />
        </div>
      </footer>
    </div>
  );
}
