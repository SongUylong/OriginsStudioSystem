"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Edit, FileText, AlertCircle } from "lucide-react";
import imageCompression from "browser-image-compression";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SecureImage } from "@/components/secure-image";
import { ClickableImage } from "@/components/clickable-image";
import { useAuth } from "@/hooks/use-auth";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TaskFormProps {
  type: "daily" | "weekly";
  onSubmit?: (data: {
    title: string;
    description: string;
    progress: number;
    notes?: string;
    media?: Array<{
      url: string;
      filename: string;
      type: string;
      caption?: string;
      key?: string;
    }>;
  }) => void;
  initialData?: {
    title?: string;
    description?: string;
    progress?: number;
    notes?: string;
    media?: Array<{
      url: string;
      filename: string;
      type: string;
      caption?: string;
      key?: string;
    }>;
  };
}

interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  type: string;
  caption?: string;
  key?: string; // For private files
  private?: boolean; // Track if file is private
}

// Validation error interface
interface ValidationErrors {
  title?: string;
  description?: string;
  general?: string;
}

export function TaskForm({ type, onSubmit, initialData }: TaskFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [progress, setProgress] = useState(initialData?.progress || 0);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [files, setFiles] = useState<UploadedFile[]>(
    initialData?.media?.map((media) => ({
      url: media.url,
      filename: media.filename,
      type: media.type,
      caption: media.caption,
      key: media.key,
      size: 0, // Default size for existing files
      private: !!media.key, // If it has a key, it's private
    })) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [currentUploadedFile, setCurrentUploadedFile] =
    useState<UploadedFile | null>(null);
  const [imageCaption, setImageCaption] = useState("");

  // Validation state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Manual file upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileCaptions, setFileCaptions] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<{
    current: number;
    total: number;
    currentFileName: string;
  }>({ current: 0, total: 0, currentFileName: "" });

  const handleFilesUploaded = (uploadedFiles: UploadedFile[]) => {
    // Add uploaded files to the list without opening caption dialog for each
    const filesWithoutCaptions = uploadedFiles.map((file) => ({
      ...file,
      caption: "", // Default empty caption
    }));
    setFiles((prev) => [...prev, ...filesWithoutCaptions]);
  };

  const handleUploadStateChange = (uploading: boolean) => {
    setIsUploading(uploading);
  };

  const openCaptionDialog = (file: UploadedFile) => {
    setCurrentUploadedFile(file);
    setImageCaption(file.caption || "");
    setCaptionDialogOpen(true);
  };

  // Image compression function
  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) {
      return file;
    }

    const options = {
      maxSizeMB: 1,
      useWebWorker: true,
      fileType: file.type,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Image compression failed:", error);
      return file;
    }
  };

  // Batch compression with progress tracking
  const compressFiles = async (files: File[]): Promise<File[]> => {
    const imagesToCompress = files.filter((file) =>
      file.type.startsWith("image/")
    );
    const nonImages = files.filter((file) => !file.type.startsWith("image/"));

    if (imagesToCompress.length === 0) {
      return files;
    }

    setIsCompressing(true);
    setCompressionProgress({
      current: 0,
      total: imagesToCompress.length,
      currentFileName: "",
    });

    const compressedImages: File[] = [];

    try {
      for (let i = 0; i < imagesToCompress.length; i++) {
        const file = imagesToCompress[i];

        setCompressionProgress({
          current: i,
          total: imagesToCompress.length,
          currentFileName: file.name,
        });

        const compressedFile = await compressImage(file);
        compressedImages.push(compressedFile);
      }

      setCompressionProgress({
        current: imagesToCompress.length,
        total: imagesToCompress.length,
        currentFileName: "",
      });

      // Combine compressed images with non-images in original order
      const result: File[] = [];
      let imageIndex = 0;
      let nonImageIndex = 0;

      for (const originalFile of files) {
        if (originalFile.type.startsWith("image/")) {
          result.push(compressedImages[imageIndex]);
          imageIndex++;
        } else {
          result.push(nonImages[nonImageIndex]);
          nonImageIndex++;
        }
      }

      return result;
    } finally {
      setIsCompressing(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    const processedFiles = await compressFiles(files);

    setSelectedFiles((prev) => [...prev, ...processedFiles]);
    setFileCaptions((prev) => [
      ...prev,
      ...new Array(processedFiles.length).fill(""),
    ]);
    setUploadProgress((prev) => [
      ...prev,
      ...new Array(processedFiles.length).fill(0),
    ]);

    if (event.target) {
      event.target.value = "";
    }
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    const validFiles = files.filter((file) => {
      const validTypes = [
        "image/",
        "video/",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/postscript",
      ];
      return (
        validTypes.some((type) => file.type.startsWith(type)) ||
        file.name.toLowerCase().endsWith(".ai")
      );
    });

    if (validFiles.length > 0) {
      const processedFiles = await compressFiles(validFiles);

      setSelectedFiles((prev) => [...prev, ...processedFiles]);
      setFileCaptions((prev) => [
        ...prev,
        ...new Array(processedFiles.length).fill(""),
      ]);
      setUploadProgress((prev) => [
        ...prev,
        ...new Array(processedFiles.length).fill(0),
      ]);
    }
  };

  // Handle caption changes
  const handleFileCaptionChange = (index: number, caption: string) => {
    const newCaptions = [...fileCaptions];
    newCaptions[index] = caption;
    setFileCaptions(newCaptions);
  };

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newCaptions = fileCaptions.filter((_, i) => i !== index);
    const newProgress = uploadProgress.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setFileCaptions(newCaptions);
    setUploadProgress(newProgress);
  };

  // Upload selected files
  const uploadSelectedFiles = async (): Promise<UploadedFile[]> => {
    if (selectedFiles.length === 0) return [];

    setIsUploading(true);
    setUploadProgress(new Array(selectedFiles.length).fill(0));

    try {
      const uploadedFiles: UploadedFile[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Get presigned URL
        const presignedResponse = await fetch("/api/upload/presigned-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            isPrivate: true,
            userId: user?.id,
          }),
        });

        if (!presignedResponse.ok) {
          throw new Error("Failed to get presigned URL");
        }

        const { signedUrl, privateUrl, key } = await presignedResponse.json();

        // Upload to S3
        const uploadResult = await new Promise<{
          url: string;
          filename: string;
          type: string;
          key: string;
        }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setUploadProgress((prev) => {
                const updated = [...prev];
                updated[i] = percent;
                return updated;
              });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                url: privateUrl,
                filename: file.name,
                type: file.type,
                key: key,
              });
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          };

          xhr.onerror = () => reject(new Error("Upload failed"));

          xhr.open("PUT", signedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        uploadedFiles.push({
          url: uploadResult.url,
          filename: uploadResult.filename,
          type: uploadResult.type,
          size: file.size,
          caption: fileCaptions[i] || "",
          key: uploadResult.key,
          private: true,
        });
      }

      // Add to files list
      setFiles((prev) => [...prev, ...uploadedFiles]);

      // Clear selected files
      setSelectedFiles([]);
      setFileCaptions([]);
      setUploadProgress([]);

      return uploadedFiles;
    } finally {
      setIsUploading(false);
    }
  };

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate title
    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters long";
    } else if (title.trim().length > 100) {
      newErrors.title = "Title must be less than 100 characters";
    }

    // Validate description
    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters long";
    } else if (description.trim().length > 2000) {
      newErrors.description = "Description must be less than 2000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));

    // Validate specific field on blur
    const newErrors = { ...errors };

    if (fieldName === "title") {
      if (!title.trim()) {
        newErrors.title = "Title is required";
      } else if (title.trim().length < 3) {
        newErrors.title = "Title must be at least 3 characters long";
      } else if (title.trim().length > 100) {
        newErrors.title = "Title must be less than 100 characters";
      } else {
        delete newErrors.title;
      }
    }

    if (fieldName === "description") {
      if (!description.trim()) {
        newErrors.description = "Description is required";
      } else if (description.trim().length < 10) {
        newErrors.description =
          "Description must be at least 10 characters long";
      } else if (description.trim().length > 2000) {
        newErrors.description = "Description must be less than 2000 characters";
      } else {
        delete newErrors.description;
      }
    }

    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      setTouched({ title: true, description: true });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload any selected files first
      await uploadSelectedFiles();

      const taskData = {
        title: title.trim(),
        description: description.trim(),
        progress: progress,
        notes: notes.trim(),
        media: files.map((file) => ({
          url: file.url,
          filename: file.filename,
          type: file.type,
          caption: file.caption,
          key: file.key, // Include the key for private file access
        })),
      };

      // Reset form only if not editing (no initial data)
      if (!initialData) {
        setTitle("");
        setDescription("");
        setProgress(0);
        setNotes("");
        setFiles([]);
        setTouched({});
        setErrors({});
      }

      onSubmit?.(taskData);
    } catch (error) {
      console.error("Error submitting task:", error);
      setErrors({ general: "Failed to submit task. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General error alert */}
        {errors.general && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="task-title">
            {type === "daily" ? "Task Title" : "Weekly Summary Title"} *
          </Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleFieldBlur("title")}
            placeholder={
              type === "daily"
                ? "Enter task title"
                : "Enter weekly summary title"
            }
            className={
              touched.title && errors.title
                ? "border-red-500 focus:border-red-500"
                : ""
            }
            required
          />
          {touched.title && errors.title && (
            <div className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.title}</span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            {title.length}/100 characters
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-description">Description *</Label>
          <RichTextEditor
            value={description}
            onChange={(value) => {
              setDescription(value);
              // Trigger validation when content changes
              if (touched.description) {
                handleFieldBlur("description");
              }
            }}
            className={`max-w-[350px] md:max-w-[450px] ${
              touched.description && errors.description ? "border-red-500" : ""
            }`}
            rows={4}
          />
          {touched.description && errors.description && (
            <div className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.description}</span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            {description.length}/2000 characters
          </div>
        </div>

        {type === "daily" && (
          <div className="space-y-2">
            <Label htmlFor="progress">Progress ({progress}%)</Label>
            <div className="space-y-4">
              <Slider
                value={[progress]}
                onValueChange={(value) => setProgress(Math.round(value[0]))}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Progress</span>
                  <span className="text-sm text-gray-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      progress === 100
                        ? "bg-green-500"
                        : progress >= 50
                        ? "bg-blue-500"
                        : "bg-gray-400"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {progress === 0 && (
                  <p className="text-xs text-gray-500 mt-2">Not started</p>
                )}
                {progress > 0 && progress < 100 && (
                  <p className="text-xs text-blue-600 mt-2">In progress</p>
                )}
                {progress === 100 && (
                  <p className="text-xs text-green-600 mt-2">Completed</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="feedback">Notes/Comments (Optional)</Label>
          <RichTextEditor
            value={notes}
            onChange={setNotes}
            rows={3}
            className="max-w-[350px] md:max-w-[450px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Attach Files (Optional)</Label>

          {/* Manual File Selection */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
              isCompressing
                ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                : isDragOver
                ? "border-blue-500 bg-blue-50 scale-105 shadow-lg"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={!isCompressing ? handleDragOver : undefined}
            onDragLeave={!isCompressing ? handleDragLeave : undefined}
            onDrop={!isCompressing ? handleDrop : undefined}
          >
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                {isDragOver
                  ? "Drop files here"
                  : selectedFiles.length > 0
                  ? "Add more files here"
                  : "Drag and drop files here, or click to select"}
              </p>
              <Input
                id="task-files"
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.ai"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isCompressing}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("task-files")?.click()}
                className="mt-2"
                disabled={isCompressing}
              >
                {isCompressing
                  ? "Compressing..."
                  : selectedFiles.length > 0
                  ? "Add More Files"
                  : "Choose Files"}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Max 10 files, 20MB each. Accepted: image/*, video/*,
              application/pdf, application/msword,
              application/vnd.openxmlformats-officedocument.wordprocessingml.document,
              text/plain, application/postscript, .ai
            </p>
          </div>

          {/* Compression Progress */}
          {isCompressing && (
            <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-blue-800">
                  Compressing Images...
                </span>
              </div>

              {compressionProgress.total > 0 && (
                <>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                      style={{
                        width: `${
                          (compressionProgress.current /
                            compressionProgress.total) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-blue-700">
                    <span>
                      {compressionProgress.current} of{" "}
                      {compressionProgress.total} images
                    </span>
                    <span>
                      {Math.round(
                        (compressionProgress.current /
                          compressionProgress.total) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  {compressionProgress.currentFileName && (
                    <div className="text-xs text-blue-600 truncate">
                      Processing: {compressionProgress.currentFileName}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <Label>Selected Files ({selectedFiles.length})</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-2 border rounded"
                  >
                    <div className="flex-shrink-0">
                      {file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          <FileText className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSelectedFile(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                onClick={uploadSelectedFiles}
                disabled={isUploading || isCompressing}
                size="sm"
              >
                {isUploading
                  ? "Uploading..."
                  : `Upload ${selectedFiles.length} File(s)`}
              </Button>
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Files ({files.length})</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.map((file, index) => (
                  <Card key={index}>
                    <CardContent className="p-3">
                      {file.type.startsWith("image/") ? (
                        file.private && file.key ? (
                          <SecureImage
                            imageKey={file.key}
                            alt={file.filename}
                            className="w-full h-24 object-cover rounded mb-2"
                            filename={file.filename}
                            fallback={
                              <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center">
                                <span className="text-xs text-gray-500">
                                  Loading...
                                </span>
                              </div>
                            }
                          />
                        ) : (
                          <ClickableImage
                            src={file.url || "/placeholder.svg"}
                            alt={file.filename}
                            className="w-full h-24 object-cover rounded mb-2"
                            filename={file.filename}
                          />
                        )
                      ) : file.type.startsWith("video/") ? (
                        <video
                          src={file.url}
                          className="w-full h-24 object-cover rounded mb-2"
                          controls
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center">
                          <span className="text-xs text-gray-500">File</span>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs truncate">
                            {file.filename}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {file.caption && (
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {file.caption}
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => openCaptionDialog(file)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          {file.caption ? "Edit Caption" : "Add Caption"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={
            isSubmitting ||
            isUploading ||
            isCompressing ||
            !title.trim() ||
            !description.trim()
          }
        >
          {isCompressing
            ? "Compressing images..."
            : isUploading
            ? "Uploading files..."
            : isSubmitting
            ? "Saving..."
            : type === "daily"
            ? "Save Task"
            : "Submit Weekly Summary"}
        </Button>

        {/* Validation summary */}
        {Object.keys(errors).length > 0 && (
          <div className="text-sm text-red-600">
            Please fix the errors above before submitting.
          </div>
        )}
      </form>

      <Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
        <DialogContent className="w-[80vw]">
          <DialogHeader>
            <DialogTitle>Add Image Caption</DialogTitle>
            <DialogDescription>
              Add a description for your uploaded image
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentUploadedFile && (
              <div className="aspect-video bg-gray-100 rounded">
                {currentUploadedFile.private && currentUploadedFile.key ? (
                  <SecureImage
                    imageKey={currentUploadedFile.key}
                    alt={currentUploadedFile.filename}
                    className="w-full h-full object-cover rounded"
                    filename={currentUploadedFile.filename}
                    fallback={
                      <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-gray-500">Loading...</span>
                      </div>
                    }
                  />
                ) : (
                  <ClickableImage
                    src={currentUploadedFile.url || "/placeholder.svg"}
                    alt={currentUploadedFile.filename}
                    className="w-full h-full object-cover rounded"
                    filename={currentUploadedFile.filename}
                  />
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="image-caption">Caption</Label>
              <Textarea
                id="image-caption"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Describe what this image shows..."
                rows={3}
                className="max-w-[350px] md:max-w-[450px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCaptionDialogOpen(false);
                setImageCaption("");
                setCurrentUploadedFile(null);
              }}
            >
              Skip Caption
            </Button>
            <Button
              onClick={() => {
                if (currentUploadedFile) {
                  setFiles((prev) =>
                    prev.map((f) =>
                      f.url === currentUploadedFile.url &&
                      f.filename === currentUploadedFile.filename
                        ? { ...f, caption: imageCaption }
                        : f
                    )
                  );
                }
                setCaptionDialogOpen(false);
                setImageCaption("");
                setCurrentUploadedFile(null);
              }}
            >
              Save Caption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
