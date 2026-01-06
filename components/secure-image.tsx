"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FullscreenImagePreview } from "@/components/fullscreen-image-preview";
import imageCompression from "browser-image-compression";

interface SecureImageProps {
  imageKey: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  filename?: string;
  clickable?: boolean;
}

export function SecureImage({
  imageKey,
  alt,
  className,
  fallback,
  filename,
  clickable = true,
}: SecureImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    async function fetchSecureImage() {
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
          `/api/private-image?key=${encodeURIComponent(imageKey)}`
        );

        if (!response.ok) {
          const errorText = await response.text();

          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const data = await response.json();

        setImageUrl(data.url);
      } catch (err) {
        console.error("SecureImage: Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load image");
      } finally {
        setLoading(false);
      }
    }

    fetchSecureImage();
  }, [imageKey, session, status]); // Remove dependency on localStorage since it's checked inside the effect

  if (loading) {
    return (
      <div className={`bg-gray-200 animate-pulse ${className}`}>
        <div className="flex items-center justify-center h-full">
          Loading...
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      fallback || (
        <div
          className={`bg-gray-100 flex items-center justify-center ${className}`}
        >
          <span className="text-gray-400">Failed to load image</span>
        </div>
      )
    );
  }

  const handleImageClick = () => {
    if (clickable && imageUrl) {
      setShowFullscreen(true);
    }
  };

  return (
    <>
      <img
        src={imageUrl}
        alt={alt}
        className={`${className} ${
          clickable ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
        }`}
        onError={() => setError("Image failed to load")}
        onClick={handleImageClick}
      />

      {clickable && imageUrl && (
        <FullscreenImagePreview
          isOpen={showFullscreen}
          onClose={() => setShowFullscreen(false)}
          imageUrl={imageUrl}
          alt={alt}
          filename={filename}
        />
      )}
    </>
  );
}

// Hook for uploading private files
export function useSecureUpload() {
  const { data: session } = useSession();

  // Image compression function
  const compressImage = async (file: File): Promise<File> => {
    // Only compress images
    if (!file.type.startsWith("image/")) {
      return file;
    }

    const options = {
      maxSizeMB: 1, // Maximum file size in MB
      useWebWorker: true, // Use web worker for better performance
      fileType: file.type, // Preserve original file type
    };

    try {
      console.log(
        `Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
      );
      const compressedFile = await imageCompression(file, options);
      console.log(
        `Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`
      );
      return compressedFile;
    } catch (error) {
      console.error("Image compression failed:", error);
      return file; // Return original file if compression fails
    }
  };

  const uploadPrivateFile = async (file: File) => {
    if (!session?.user?.id) {
      throw new Error("User not authenticated via NextAuth");
    }

    // Compress the file if it's an image
    const compressedFile = await compressImage(file);

    // Step 1: Get presigned URL
    const presignedResponse = await fetch("/api/upload/presigned-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: compressedFile.name,
        contentType: compressedFile.type,
        isPrivate: true,
        userId: session.user.id,
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error("Failed to get presigned URL");
    }

    const { signedUrl, privateUrl, key } = await presignedResponse.json();

    // Step 2: Upload directly to S3
    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      body: compressedFile,
      headers: {
        "Content-Type": compressedFile.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    return {
      url: privateUrl,
      filename: compressedFile.name,
      size: compressedFile.size,
      type: compressedFile.type,
      private: true,
      key: key,
    };
  };

  const uploadPublicFile = async (file: File) => {
    // Compress the file if it's an image
    const compressedFile = await compressImage(file);

    // Step 1: Get presigned URL
    const presignedResponse = await fetch("/api/upload/presigned-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: compressedFile.name,
        contentType: compressedFile.type,
        isPrivate: false,
        userId: session?.user?.id || "anonymous",
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error("Failed to get presigned URL");
    }

    const { signedUrl, privateUrl, key } = await presignedResponse.json();

    // Step 2: Upload directly to S3
    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      body: compressedFile,
      headers: {
        "Content-Type": compressedFile.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    return {
      url: privateUrl,
      filename: compressedFile.name,
      size: compressedFile.size,
      type: compressedFile.type,
      private: false,
      key: key,
    };
  };

  return {
    uploadPrivateFile,
    uploadPublicFile,
  };
}
