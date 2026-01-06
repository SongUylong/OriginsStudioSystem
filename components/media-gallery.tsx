"use client";

import type React from "react";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SecureImage } from "@/components/secure-image";
import { ClickableImage } from "@/components/clickable-image";
import { SecureDocument } from "@/components/secure-document";
import { SecureVideo } from "@/components/secure-video";
import { useAuth } from "@/hooks/use-auth";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";

interface MediaFile {
  url: string;
  filename: string;
  size: number;
  type: string;
  uploadedAt: string;
  key?: string; // For private files
  private?: boolean;
}

export function MediaGallery() {
  const { user } = useAuth();
  const [files, setFiles] = useState<MediaFile[]>([]);

  const handleFilesUploaded = (
    uploadedFiles: Array<{
      url: string;
      filename: string;
      size: number;
      type: string;
      key?: string;
      private?: boolean;
    }>
  ) => {
    const newFiles = uploadedFiles.map((file) => ({
      ...file,
      uploadedAt: new Date().toISOString(),
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  const getFileTypeColor = (type: string) => {
    if (type.startsWith("image/")) return "bg-green-100 text-green-800";
    if (type.startsWith("video/")) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          Media Gallery
        </CardTitle>
        <CardDescription>
          Upload and manage your task-related files (images, videos, documents)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Upload Area */}
        <EnhancedFileUpload
          onFilesUploaded={handleFilesUploaded}
          maxFiles={20}
          maxSize={50}
          acceptedTypes={[
            "image/*",
            "video/*",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "application/postscript",
            ".ai",
          ]}
          userId={user?.id || "user_123"}
          isPrivate={true}
          multiple={true}
        />

        {/* File Grid */}
        {files.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="aspect-video bg-gray-100 relative">
                  {file.type.startsWith("image/") ? (
                    file.private && file.key ? (
                      <SecureImage
                        imageKey={file.key}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                        filename={file.filename}
                        fallback={
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-500">Loading...</span>
                          </div>
                        }
                      />
                    ) : (
                      <ClickableImage
                        src={file.url || "/placeholder.svg"}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                        filename={file.filename}
                      />
                    )
                  ) : file.type.startsWith("video/") ? (
                    <video
                      src={file.url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-500">File</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm truncate">
                      {file.filename}
                    </h3>
                    <div className="flex items-center justify-between">
                      <Badge
                        className={`text-xs ${getFileTypeColor(file.type)}`}
                      >
                        {file.type.split("/")[0]}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[80vw]">
                          <DialogHeader>
                            <DialogTitle>{file.filename}</DialogTitle>
                            <DialogDescription>
                              {file.type} • {formatFileSize(file.size)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="mt-4">
                            {file.type.startsWith("image/") ? (
                              file.private && file.key ? (
                                <SecureImage
                                  imageKey={file.key}
                                  alt={file.filename}
                                  className="w-full max-h-96 object-contain"
                                  filename={file.filename}
                                  fallback={
                                    <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
                                      <span className="text-gray-500">
                                        Loading...
                                      </span>
                                    </div>
                                  }
                                />
                              ) : (
                                <ClickableImage
                                  src={file.url || "/placeholder.svg"}
                                  alt={file.filename}
                                  className="w-full max-h-96 object-contain"
                                  filename={file.filename}
                                />
                              )
                            ) : file.type.startsWith("video/") ? (
                              file.private && file.key ? (
                                <SecureVideo
                                  videoKey={file.key}
                                  filename={file.filename}
                                  className="w-full max-h-96"
                                />
                              ) : (
                                <video
                                  src={file.url}
                                  className="w-full max-h-96"
                                  controls
                                />
                              )
                            ) : file.private && file.key ? (
                              <SecureDocument
                                documentKey={file.key}
                                filename={file.filename}
                                className="w-full h-32 flex items-center justify-center"
                                type={file.type}
                              />
                            ) : (
                              <div
                                className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                                onClick={() => window.open(file.url, "_blank")}
                              >
                                <Download className="h-8 w-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600">
                                  {file.filename}
                                </span>
                                <span className="text-xs text-gray-400">
                                  Click to download
                                </span>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm" asChild>
                        <a href={file.url} download={file.filename}>
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {files.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No files uploaded yet. Upload images, videos, or documents to get
            started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
