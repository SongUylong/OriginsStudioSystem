"use client";

import { useState } from "react";
import { FullscreenImagePreview } from "@/components/fullscreen-image-preview";

interface ClickableImageProps {
  src: string;
  alt: string;
  className?: string;
  filename?: string;
  clickable?: boolean;
  onError?: () => void;
}

export function ClickableImage({
  src,
  alt,
  className,
  filename,
  clickable = true,
  onError,
}: ClickableImageProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  const handleImageClick = () => {
    if (clickable) {
      setShowFullscreen(true);
    }
  };

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className} ${clickable ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
        onError={onError}
        onClick={handleImageClick}
      />
      
      {clickable && (
        <FullscreenImagePreview
          isOpen={showFullscreen}
          onClose={() => setShowFullscreen(false)}
          imageUrl={src}
          alt={alt}
          filename={filename}
        />
      )}
    </>
  );
} 