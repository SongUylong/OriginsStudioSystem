"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  X,
  FileIcon,
  ImageIcon,
  VideoIcon,
  FileTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  type: string;
  caption?: string;
  key?: string;
  private?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  controller?: AbortController;
  id: string;
}
import imageCompression from "browser-image-compression";

interface EnhancedFileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  userId?: string;
  isPrivate?: boolean;
  multiple?: boolean;
  disabled?: boolean;
}

export function EnhancedFileUpload({
  onFilesUploaded,
  onUploadStateChange,
  maxFiles = 10,
  maxSize = 50,
  acceptedTypes = [
    "image/*",
    "video/*",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/postscript",
    ".ai",
  ],
  userId = "user_123",
  isPrivate = true,
  multiple = true,
  disabled = false,
}: EnhancedFileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [completedFiles, setCompletedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);
  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 1,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Image compression failed:", error);
      return file; // Return original file on error
    }
  };
  // Notify parent component about upload state changes
  React.useEffect(() => {
    const isUploading = uploadingFiles.length > 0;
    onUploadStateChange?.(isUploading);
  }, [uploadingFiles.length, onUploadStateChange]);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    const isValidType = acceptedTypes.some((type) => {
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.split("/")[0] + "/");
      }
      if (type.startsWith(".")) {
        // Handle file extensions like .ai
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return (
        file.type === type ||
        (type === "application/postscript" &&
          file.name.toLowerCase().endsWith(".ai"))
      );
    });

    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(
        ", "
      )}`;
    }

    return null;
  };

  const uploadFile = async (
    uploadingFile: UploadingFile
  ): Promise<UploadedFile | null> => {
    const { file, controller, id } = uploadingFile;

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
          isPrivate,
          userId,
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error("Failed to get presigned URL");
      }

      const { signedUrl, privateUrl, key } = await presignedResponse.json();

      // Step 2: Upload directly to S3 using presigned URL with progress tracking
      const result = await new Promise<UploadedFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === id ? { ...f, progress: percentComplete } : f
              )
            );
          }
        });

        // Handle completion
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // S3 upload successful, create our response object
            resolve({
              url: privateUrl,
              filename: file.name,
              size: file.size,
              type: file.type,
              private: isPrivate,
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

        // Handle abort
        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelled"));
        });

        // Set up abort controller
        if (controller) {
          controller.signal.addEventListener("abort", () => {
            xhr.abort();
          });
        }

        // Start direct upload to S3
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // Update status to completed
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "completed" as const, progress: 100 }
            : f
        )
      );

      return result;
    } catch (error) {
      if (error instanceof Error && error.message === "Upload cancelled") {
        // Upload was cancelled
        setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
        return null;
      }

      // Update status to error
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "error" as const } : f))
      );

      console.error("Upload error:", error);
      return null;
    }
  };

  const processFiles = useCallback(
    async (files: File[]) => {
      if (disabled) return;

      const validFiles: File[] = [];
      const errors: string[] = [];

      // Validate files
      for (const file of files) {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      }
      // Check max files limit
      const totalFiles =
        completedFiles.length + uploadingFiles.length + validFiles.length;
      if (totalFiles > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      if (errors.length > 0) {
        alert(`Upload errors:\n${errors.join("\n")}`);
        return;
      }

      const compressedFiles: File[] = [];
      for (const file of validFiles) {
        if (file.type.startsWith("image/")) {
          const compressed = await compressImage(file);
          compressedFiles.push(compressed);
        } else {
          compressedFiles.push(file);
        }
      }
      // Create uploading file entries
      const newUploadingFiles: UploadingFile[] = compressedFiles.map(
        (file) => ({
          file,
          progress: 0,
          status: "uploading" as const,
          controller: new AbortController(),
          id: generateId(),
        })
      );

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Start uploads
      const uploadPromises = newUploadingFiles.map(async (uploadingFile) => {
        try {
          const result = await uploadFile(uploadingFile);

          if (result) {
            setCompletedFiles((prev) => [...prev, result]);

            // Remove from uploading after a delay
            setTimeout(() => {
              setUploadingFiles((prev) =>
                prev.filter((f) => f.id !== uploadingFile.id)
              );
            }, 1000);

            return result;
          }
        } catch (error) {
          console.error("Upload error:", error);
        }

        return null;
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(Boolean) as UploadedFile[];

      if (successfulUploads.length > 0) {
        onFilesUploaded(successfulUploads);
      }
    },
    [
      disabled,
      completedFiles.length,
      uploadingFiles.length,
      maxFiles,
      maxSize,
      acceptedTypes,
      isPrivate,
      userId,
      onFilesUploaded,
    ]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

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

      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    },
    [processFiles]
  );

  const cancelUpload = (id: string) => {
    const uploadingFile = uploadingFiles.find((f) => f.id === id);
    if (uploadingFile?.controller) {
      uploadingFile.controller.abort();
    }
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getFileIcon = (type: string, filename?: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith("video/")) return <VideoIcon className="h-4 w-4" />;
    if (
      type === "application/pdf" ||
      type === "application/msword" ||
      type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      type.startsWith("text/")
    ) {
      return <FileTextIcon className="h-4 w-4" />;
    }
    if (
      type === "application/postscript" ||
      (filename && filename.toLowerCase().endsWith(".ai"))
    ) {
      return <FileIcon className="h-4 w-4" />;
    }
    return <FileIcon className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = (status: UploadingFile["status"]) => {
    switch (status) {
      case "uploading":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload
          className={cn(
            "h-12 w-12 mx-auto mb-4",
            isDragOver ? "text-blue-500" : "text-gray-400"
          )}
        />
        <p className="text-gray-600 mb-2">
          {isDragOver
            ? "Drop files here to upload"
            : "Drag and drop files here, or click to select"}
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Max {maxFiles} files, {maxSize}MB each. Accepted:{" "}
          {acceptedTypes.join(", ")}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={
            disabled ||
            completedFiles.length + uploadingFiles.length >= maxFiles
          }
        >
          Choose Files
        </Button>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Uploading Files</h4>
          {uploadingFiles.map((uploadingFile) => (
            <Card key={uploadingFile.id} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {getFileIcon(
                      uploadingFile.file.type,
                      uploadingFile.file.name
                    )}
                    <span className="text-sm truncate">
                      {uploadingFile.file.name}
                    </span>
                    <Badge
                      className={cn(
                        "text-xs",
                        getStatusColor(uploadingFile.status)
                      )}
                    >
                      {uploadingFile.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelUpload(uploadingFile.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatFileSize(uploadingFile.file.size)}</span>
                    <span>{Math.round(uploadingFile.progress)}%</span>
                  </div>
                  <Progress value={uploadingFile.progress} className="h-2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Summary */}
      {(completedFiles.length > 0 || uploadingFiles.length > 0) && (
        <div className="text-xs text-gray-500">
          {completedFiles.length} completed, {uploadingFiles.length} uploading
          {maxFiles &&
            ` (${completedFiles.length + uploadingFiles.length}/${maxFiles})`}
        </div>
      )}
    </div>
  );
}
