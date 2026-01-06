"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { VideoIcon } from "lucide-react";

interface SecureVideoProps {
  videoKey: string;
  filename: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function SecureVideo({
  videoKey,
  filename,
  className,
  fallback,
}: SecureVideoProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    async function fetchSecureVideo() {
      if (status === "loading") {
        return; // Still loading, wait
      }

      if (status === "unauthenticated" || !session?.user?.id) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/private-image?key=${encodeURIComponent(videoKey)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status}`);
        }

        const data = await response.json();
        setVideoUrl(data.url);
      } catch (err) {
        console.error("SecureVideo: Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load video");
      } finally {
        setLoading(false);
      }
    }

    fetchSecureVideo();
  }, [videoKey, session, status]);

  if (loading) {
    return (
      <div className={`bg-white/10 border border-white/20 flex items-center justify-center animate-pulse ${className}`}>
        <VideoIcon className="h-6 w-6 text-white/70" />
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      fallback || (
        <div
          className={`bg-white/10 border border-white/20 flex items-center justify-center ${className}`}
        >
          <span className="text-red-400 text-xs text-center">Failed to load video</span>
        </div>
      )
    );
  }

  return (
    <video
      src={videoUrl}
      className={className}
      controls
      preload="metadata"
      onError={() => setError("Video failed to load")}
    />
  );
}