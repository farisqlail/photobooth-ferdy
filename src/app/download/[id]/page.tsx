"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Video, Film, Download } from "lucide-react";
import Image from "next/image";

type Asset = {
  name: string;
  url: string;
  type: "photo" | "gif" | "video";
};

export default function DownloadPage() {
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!id) return;

    const fetchAssets = async () => {
      try {
        const { data: files, error } = await supabase.storage
          .from("captures")
          .list(`transactions/${id}`);

        if (error) throw error;

        const foundAssets: Asset[] = [];
        const fileNames = files.map(f => f.name);
        
        // 1. Photo
        if (fileNames.includes("final.png")) {
           const { data } = await supabase.storage
             .from("captures")
             .createSignedUrl(`transactions/${id}/final.png`, 3600);
           if (data?.signedUrl) {
             foundAssets.push({ name: "Foto", url: data.signedUrl, type: "photo" });
           }
        }

        // 2. GIF
        if (fileNames.includes("animation.gif")) {
           const { data } = await supabase.storage
             .from("captures")
             .createSignedUrl(`transactions/${id}/animation.gif`, 3600);
           if (data?.signedUrl) {
             foundAssets.push({ name: "GIF", url: data.signedUrl, type: "gif" });
           }
        }

        // 3. Video
        if (fileNames.includes("video.webm")) {
           const { data } = await supabase.storage
             .from("captures")
             .createSignedUrl(`transactions/${id}/video.webm`, 3600);
           if (data?.signedUrl) {
             foundAssets.push({ name: "Live Video", url: data.signedUrl, type: "video" });
           }
        }

        setAssets(foundAssets);
      } catch (err) {
        console.error("Error fetching assets:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-center text-white">
        <p className="mb-4">Foto tidak ditemukan atau sedang diproses.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
           Coba Lagi
        </Button>
      </div>
    );
  }

  const photo = assets.find(a => a.type === "photo");

  return (
    <div className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto max-w-md space-y-6">
        <header className="text-center py-6">
          <h1 className="text-2xl font-bold">Download Foto</h1>
          <p className="text-gray-400 text-sm mt-2">Terima kasih telah berkunjung!</p>
        </header>

        {photo && (
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
            <Image 
              src={photo.url} 
              alt="Photo" 
              fill 
              className="object-contain" 
              unoptimized 
            />
          </div>
        )}

        <div className="space-y-3">
          {assets.map((asset) => (
            <Button
              key={asset.type}
              asChild
              className="w-full justify-between h-auto py-4"
              variant={asset.type === "photo" ? "default" : "secondary"}
            >
              <a href={asset.url} download target="_blank" rel="noopener noreferrer">
                <span className="flex items-center gap-3">
                  {asset.type === "photo" && <ImageIcon className="h-5 w-5" />}
                  {asset.type === "gif" && <Film className="h-5 w-5" />}
                  {asset.type === "video" && <Video className="h-5 w-5" />}
                  <span className="font-medium">Download {asset.name}</span>
                </span>
                <Download className="h-5 w-5 opacity-50" />
              </a>
            </Button>
          ))}
        </div>
        
        <footer className="pt-8 text-center text-xs text-gray-500">
           &copy; {new Date().getFullYear()} Photobooth
        </footer>
      </div>
    </div>
  );
}
