"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FullscreenImagePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt: string;
  filename?: string;
}

export function FullscreenImagePreview({
  isOpen,
  onClose,
  imageUrl,
  alt,
  filename,
}: FullscreenImagePreviewProps) {
  // Keyboard shortcut to close with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackgroundClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleCloseButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const content = (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
      onClick={handleBackgroundClick}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCloseButtonClick}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        title="Close (Esc)"
      >
        <X className="h-6 w-6" />
      </Button>
      <img
        src={imageUrl}
        alt={alt}
        className="w-[80%] h-[80%] object-contain"
        draggable={false}
        onClick={handleImageClick}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      />
    </div>
  );

  // Use portal to render outside normal DOM hierarchy
  return createPortal(content, document.body);
}
