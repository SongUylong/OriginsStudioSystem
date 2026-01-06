"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Upload, X, ImageIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SecureImage } from "@/components/secure-image";
import imageCompression from "browser-image-compression";

interface AvatarUploadProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
    avatarKey?: string;
  };
  onUploadComplete?: (uploadedFile: { url: string; key: string }) => void;
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  id: string;
}

export function AvatarUpload({
  user,
  onUploadComplete,
  disabled = false,
}: AvatarUploadProps) {
  const [uploadingFile, setUploadingFile] = useState<UploadingFile | null>(
    null
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Only image files are allowed";
    }

    return null;
  };

  // Image compression function
  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1, // Maximum file size in MB
      useWebWorker: true, // Use web worker for better performance
      fileType: file.type, // Preserve original file type
    };

    try {
      console.log(
        `Compressing avatar ${file.name} (${(file.size / 1024 / 1024).toFixed(
          2
        )} MB)`
      );
      const compressedFile = await imageCompression(file, options);
      console.log(
        `Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`
      );
      return compressedFile;
    } catch (error) {
      console.error("Avatar image compression failed:", error);
      return file; // Return original file if compression fails
    }
  };

  const uploadFile = async (
    file: File
  ): Promise<{ url: string; key: string } | null> => {
    const uploadingFileData: UploadingFile = {
      file,
      progress: 0,
      status: "uploading",
      id: Math.random().toString(36).substr(2, 9),
    };

    setUploadingFile(uploadingFileData);
    setIsUploading(true);

    try {
      // Step 1: Get presigned URL from our API
      const presignedResponse = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          isPrivate: true,
          userId: user.id,
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error("Failed to get presigned URL");
      }

      const { signedUrl, privateUrl, key } = await presignedResponse.json();

      // Step 2: Upload directly to S3 with progress tracking
      const result = await new Promise<{ url: string; key: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              setUploadingFile((prev) =>
                prev ? { ...prev, progress: percentComplete } : null
              );
            }
          });

          // Handle completion
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              // S3 upload successful, create our response object
              resolve({
                url: privateUrl,
                key: key,
              });
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          });

          // Handle errors
          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed"));
          });

          // Start direct upload to S3
          xhr.open("PUT", signedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        }
      );

      // Update status to completed
      setUploadingFile((prev) =>
        prev ? { ...prev, status: "completed", progress: 100 } : null
      );

      // Update user profile
      const updateResponse = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          avatar: result.url,
          avatarKey: result.key,
        }),
      });

      if (updateResponse.ok) {
        onUploadComplete?.(result);

        // Clear uploading state after a delay
        setTimeout(() => {
          setUploadingFile(null);
          setIsUploading(false);
        }, 1500);

        return result;
      } else {
        throw new Error("Failed to update user profile");
      }
    } catch (error) {
      setUploadingFile((prev) => (prev ? { ...prev, status: "error" } : null));
      setIsUploading(false);
      console.error("Avatar upload error:", error);
      return null;
    }
  };

  const processFile = useCallback(
    async (file: File) => {
      if (disabled || isUploading) return;

      const error = validateFile(file);
      if (error) {
        alert(`Upload error: ${error}`);
        return;
      }

      // Compress the image before uploading
      const compressedFile = await compressImage(file);
      await uploadFile(compressedFile);
    },
    [disabled, isUploading, user.id]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) {
        setIsDragOver(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile, disabled, isUploading]
  );

  const cancelUpload = () => {
    setUploadingFile(null);
    setIsUploading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Avatar Display */}
      <div className="flex items-center space-x-4">
        <div
          className={cn(
            "relative",
            !disabled && !isUploading && "cursor-pointer group"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() =>
            !disabled && !isUploading && fileInputRef.current?.click()
          }
        >
          <Avatar
            className={cn(
              "h-20 w-20 transition-all",
              isDragOver && "ring-2 ring-blue-400 ring-offset-2",
              !disabled && !isUploading && "group-hover:opacity-75"
            )}
          >
            {user.avatarKey ? (
              <SecureImage
                imageKey={user.avatarKey}
                alt={`${user.name}'s avatar`}
                className="h-full w-full rounded-full object-cover"
                fallback={
                  <AvatarFallback className="text-lg">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                }
              />
            ) : (
              <>
                <AvatarImage src={user.avatar || "/placeholder.svg"} />
                <AvatarFallback className="text-lg">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </>
            )}
          </Avatar>

          {!disabled && !isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="h-6 w-6 text-white" />
            </div>
          )}

          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500 bg-opacity-75 rounded-full">
              <Upload className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="space-y-2">
            <div>
              <h3 className="font-medium">Profile Picture</h3>
              <p className="text-sm text-gray-600">
                {isDragOver
                  ? "Drop image here to upload"
                  : "Click avatar or drag image here to upload"}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || isUploading}
            />

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Choose Image"}
              </Button>
            </div>

            <p className="text-xs text-gray-500">JPG, PNG or GIF (max 2MB)</p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFile && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ImageIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {uploadingFile.file.name}
              </span>
              <Badge
                className={cn(
                  "text-xs",
                  uploadingFile.status === "uploading" &&
                    "bg-blue-100 text-blue-800",
                  uploadingFile.status === "completed" &&
                    "bg-green-100 text-green-800",
                  uploadingFile.status === "error" && "bg-red-100 text-red-800"
                )}
              >
                {uploadingFile.status === "uploading" && "Uploading"}
                {uploadingFile.status === "completed" && (
                  <span className="flex items-center">
                    <CheckIcon className="h-3 w-3 mr-1" />
                    Complete
                  </span>
                )}
                {uploadingFile.status === "error" && "Error"}
              </Badge>
            </div>

            {uploadingFile.status === "uploading" && (
              <Button variant="ghost" size="sm" onClick={cancelUpload}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatFileSize(uploadingFile.file.size)}</span>
              <span>{Math.round(uploadingFile.progress)}%</span>
            </div>
            <Progress value={uploadingFile.progress} className="h-2" />
          </div>
        </div>
      )}
    </div>
  );
}
