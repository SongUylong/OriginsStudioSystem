"use client";

import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  MessageSquare,
  AlertTriangle,
  Clock,
  CalendarDays,
  FileText,
  RefreshCw,
} from "lucide-react";
import { TaskForm } from "@/components/task-form";
import { SecureImage } from "@/components/secure-image";
import { SecureDocument } from "@/components/secure-document";
import { SecureVideo } from "@/components/secure-video";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import imageCompression from "browser-image-compression";

import { Slider } from "@/components/ui/slider";
import { FormattedText } from "@/components/ui/formatted-text";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// CollapsibleDescription component
interface CollapsibleDescriptionProps {
  description: string;
  createdAt: string;
}

function CollapsibleDescription({
  description,
  createdAt,
}: {
  description: string;
  createdAt: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 50;
  const isLong = description.length > maxLength;

  if (!isLong) {
    return (
      <FormattedText content={description} className="text-sm text-gray-600" />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-1">
      {isExpanded ? (
        <>
          <FormattedText
            content={description}
            className="text-sm text-gray-600"
          />
          <button
            onClick={() => setIsExpanded(false)}
            className="text-blue-600 hover:text-blue-800 text-sm underline justify-self-start"
          >
            Show less
          </button>
        </>
      ) : (
        <>
          <FormattedText
            content={description}
            maxLength={maxLength}
            className="text-sm text-gray-600"
          />

          <button
            onClick={() => setIsExpanded(true)}
            className="text-blue-600 hover:text-blue-800 text-sm underline justify-self-start"
          >
            Read more
          </button>
        </>
      )}
    </div>
  );
}

interface Task {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: "in-progress" | "completed";
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueDate?: string;
  createdAt: string;
  notes?: string;
  assignedBy?: {
    id: string;
    name: string;
    email: string;
  };
  continuedFromTaskId?: string;
  continuedFromTask?: {
    id: string;
    title: string;
    progress: number;
  };
  continuedToTask?: {
    id: string;
    title: string;
    progress: number;
  }[];
  media: Array<{
    id: string;
    url: string;
    filename: string;
    type: string;
    caption?: string;
    key?: string; // For private files
  }>;
}

interface TodayTasksProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "staff" | "manager" | "bk";
    avatar?: string;
  };
}

export function TodayTasks({ user }: TodayTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [updatingTask, setUpdatingTask] = useState<Task | null>(null);
  const [newProgress, setNewProgress] = useState<number>(0);
  const [showPreviousTasksDialog, setShowPreviousTasksDialog] = useState(false);
  const [previousTasks, setPreviousTasks] = useState<Task[]>([]);
  const [loadingPreviousTasks, setLoadingPreviousTasks] = useState(false);
  const [hasPreviousTasks, setHasPreviousTasks] = useState(false);

  // Add notes dialog states
  const [showAddNotesDialog, setShowAddNotesDialog] = useState(false);
  const [notesTask, setNotesTask] = useState<Task | null>(null);
  const [newNotes, setNewNotes] = useState<string>("");
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false);

  // Add media dialog states
  const [showAddMediaDialog, setShowAddMediaDialog] = useState(false);
  const [mediaTask, setMediaTask] = useState<Task | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaCaptions, setMediaCaptions] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<{
    current: number;
    total: number;
    currentFileName: string;
  }>({ current: 0, total: 0, currentFileName: "" });

  // Remove media dialog states
  const [showRemoveMediaAlert, setShowRemoveMediaAlert] = useState(false);
  const [removingMedia, setRemovingMedia] = useState<{
    taskId: string;
    mediaId: string;
    filename: string;
  } | null>(null);

  // Fetch tasks for today
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `/api/tasks?staffId=${user.id}&date=${today}`
      );
      if (response.ok) {
        const data = await response.json();
        setTasks(
          data.tasks.map((task: any) => ({
            ...task,
            status: task.status.toLowerCase().replace("_", "-"),
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user.id]);

  // Auto-refresh disabled - use manual refresh button instead

  // Window focus refresh disabled - use manual refresh button instead

  // Check for previous incomplete tasks on component mount
  useEffect(() => {
    const checkPreviousTasks = async () => {
      try {
        // Set date range to check for incomplete tasks from the last 30 days (excluding today)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1); // Yesterday

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // 30 days ago

        const response = await fetch(
          `/api/tasks?staffId=${user.id}&startDate=${
            startDate.toISOString().split("T")[0]
          }&endDate=${endDate.toISOString().split("T")[0]}&incomplete=true`
        );

        if (response.ok) {
          const data = await response.json();
          const incompleteTasks = data.tasks.filter(
            (task: any) => task.status !== "COMPLETED" && task.progress < 100
          );

          // The API already filters out tasks that have been continued
          setHasPreviousTasks(incompleteTasks.length > 0);
        }
      } catch (error) {
        console.error("Failed to check previous tasks:", error);
      }
    };

    checkPreviousTasks();
  }, [user.id, tasks]);

  // Fetch previous incomplete tasks
  const fetchPreviousIncompleteTasks = async () => {
    setLoadingPreviousTasks(true);
    try {
      // Set date range to fetch incomplete tasks from the last 30 days (excluding today)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Yesterday

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 30 days ago

      const response = await fetch(
        `/api/tasks?staffId=${user.id}&startDate=${
          startDate.toISOString().split("T")[0]
        }&endDate=${endDate.toISOString().split("T")[0]}&incomplete=true`
      );

      if (response.ok) {
        const data = await response.json();
        const incompleteTasks = data.tasks
          .filter(
            (task: any) => task.status !== "COMPLETED" && task.progress < 100
          )
          .map((task: any) => ({
            ...task,
            status: task.status.toLowerCase().replace("_", "-"),
          }));

        // No need for complex title matching - the API already filters out continued tasks
        setPreviousTasks(incompleteTasks);
        setHasPreviousTasks(incompleteTasks.length > 0);
      }
    } catch (error) {
      console.error("Failed to fetch previous incomplete tasks:", error);
    } finally {
      setLoadingPreviousTasks(false);
    }
  };

  const handleShowPreviousTasks = () => {
    setShowPreviousTasksDialog(true);
    fetchPreviousIncompleteTasks();
  };

  const handleContinueTask = async (previousTask: Task) => {
    try {
      // Use the original title without any numbering
      const originalBaseName = previousTask.title
        .replace(/ \(continue\)\^\d+$/, "")
        .replace(/ x\d+$/, "")
        .replace(/ \(Continued\).*$/, "");

      // Format notes properly - only include if there are actual notes
      let formattedNotes = "";
      if (
        previousTask.notes &&
        previousTask.notes.trim() !== "" &&
        previousTask.notes.trim() !== "None"
      ) {
        // Split notes by lines and create numbered list
        const noteLines = previousTask.notes
          .split("\n")
          .filter((line) => line.trim() !== "");
        formattedNotes = noteLines
          .map((note, index) => `${index + 1}. ${note.trim()}`)
          .join("\n");
      }

      // Create a new task for today based on the previous task
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: originalBaseName, // No more numbering
          description: previousTask.description,
          progress: previousTask.progress,
          notes: formattedNotes, // Only include formatted notes if they exist
          staffId: user.id,
          media: previousTask.media, // Copy over any media from the previous task
          continuedFromTaskId: previousTask.id, // Link this task to the previous one
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks((prev) => [
          ...prev,
          {
            ...data.task,
            status: data.task.status.toLowerCase().replace("_", "-"),
          },
        ]);
        setShowPreviousTasksDialog(false);
      }
    } catch (error) {
      console.error("Failed to continue task:", error);
    }
  };

  const handleTaskSubmit = async (taskData: any) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...taskData,
          staffId: user.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks((prev) => [
          ...prev,
          {
            ...data.task,
            status: data.task.status.toLowerCase().replace("_", "-"),
          },
        ]);
        setShowAddTask(false);
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowEditTask(true);
  };

  const handleTaskUpdate = async (taskData: any) => {
    if (!editingTask) return;

    try {
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingTask.id,
          userId: user.id,
          userRole: user.role,
          isAddingNotes: false,
          ...taskData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks((prev) =>
          prev.map((task) =>
            task.id === editingTask.id
              ? {
                  ...data.task,
                  status: data.task.status.toLowerCase().replace("_", "-"),
                }
              : task
          )
        );
        setShowEditTask(false);
        setEditingTask(null);
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = (task: Task) => {
    setDeletingTask(task);
    setShowDeleteAlert(true);
  };

  const confirmDeleteTask = async () => {
    if (!deletingTask) return;

    try {
      const response = await fetch(
        `/api/tasks?id=${deletingTask.id}&userId=${user.id}&userRole=${user.role}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setTasks((prev) => prev.filter((task) => task.id !== deletingTask.id));
        setShowDeleteAlert(false);
        setDeletingTask(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Failed to delete task");
    }
  };

  const handleUpdateProgress = (task: Task) => {
    setUpdatingTask(task);
    setNewProgress(task.progress);
    setShowProgressDialog(true);
  };

  const confirmProgressUpdate = async () => {
    if (!updatingTask) return;

    try {
      // If task is assigned by a manager and user is staff, use isAddingNotes: true
      // to allow progress updates on assigned tasks
      const isAssignedTask = updatingTask.assignedBy && user.role === "staff";

      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: updatingTask.id,
          progress: newProgress,
          status: newProgress === 100 ? "COMPLETED" : "IN_PROGRESS",
          userId: user.id,
          userRole: user.role,
          isAddingNotes: isAssignedTask, // Use true for assigned tasks to allow progress updates
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks((prev) =>
          prev.map((task) =>
            task.id === updatingTask.id
              ? {
                  ...data.task,
                  status: data.task.status.toLowerCase().replace("_", "-"),
                }
              : task
          )
        );
        setShowProgressDialog(false);
        setUpdatingTask(null);
        setNewProgress(0);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update progress");
      }
    } catch (error) {
      console.error("Failed to update progress:", error);
      alert("Failed to update progress");
    }
  };

  const handleAddNotes = (task: Task) => {
    setNotesTask(task);
    setNewNotes(task.notes || "");
    setShowAddNotesDialog(true);
  };

  const confirmAddNotes = async () => {
    if (!notesTask) return;

    setIsSubmittingNotes(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: notesTask.id,
          notes: newNotes,
          userId: user.id,
          userRole: user.role,
          isAddingNotes: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks((prev) =>
          prev.map((task) =>
            task.id === notesTask.id
              ? {
                  ...data.task,
                  status: data.task.status.toLowerCase().replace("_", "-"),
                }
              : task
          )
        );
        setShowAddNotesDialog(false);
        setNotesTask(null);
        setNewNotes("");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update notes");
      }
    } catch (error) {
      console.error("Failed to update notes:", error);
      alert("Failed to update notes");
    } finally {
      setIsSubmittingNotes(false);
    }
  };

  const handleAddMedia = (task: Task) => {
    setMediaTask(task);
    setSelectedFiles([]);
    setMediaCaptions([]);
    setUploadProgress([]);
    setIsDragOver(false);
    setIsCompressing(false);
    setCompressionProgress({ current: 0, total: 0, currentFileName: "" });
    setShowAddMediaDialog(true);
  };

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

  // Batch compression with progress tracking
  const compressFiles = async (files: File[]): Promise<File[]> => {
    const imagesToCompress = files.filter((file) =>
      file.type.startsWith("image/")
    );
    const nonImages = files.filter((file) => !file.type.startsWith("image/"));

    if (imagesToCompress.length === 0) {
      return files; // No images to compress
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

  // Handle file selection (compress but don't upload)
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);

    // Compress files with progress tracking
    const processedFiles = await compressFiles(files);

    // Append to existing files instead of replacing them
    setSelectedFiles((prev) => [...prev, ...processedFiles]);
    setMediaCaptions((prev) => [
      ...prev,
      ...new Array(processedFiles.length).fill(""),
    ]);
    setUploadProgress((prev) => [
      ...prev,
      ...new Array(processedFiles.length).fill(0),
    ]);

    // Clear the file input so the same file can be selected again
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
        "audio/",
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
      // Compress files with progress tracking
      const processedFiles = await compressFiles(validFiles);

      setSelectedFiles((prev) => [...prev, ...processedFiles]);
      setMediaCaptions((prev) => [
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
  const handleCaptionChange = (index: number, caption: string) => {
    const newCaptions = [...mediaCaptions];
    newCaptions[index] = caption;
    setMediaCaptions(newCaptions);
  };

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newCaptions = mediaCaptions.filter((_, i) => i !== index);
    const newProgress = uploadProgress.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setMediaCaptions(newCaptions);
    setUploadProgress(newProgress);
  };

  // Manual upload function (called when Upload button is clicked)
  const confirmAddMedia = async () => {
    if (!mediaTask || selectedFiles.length === 0) return;

    setIsUploadingMedia(true);
    setUploadProgress(new Array(selectedFiles.length).fill(0));

    try {
      const uploadedMedia = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

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
        const uploadResult = await new Promise((resolve, reject) => {
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

          // Start direct upload to S3
          xhr.open("PUT", signedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        if (
          uploadResult &&
          typeof uploadResult === "object" &&
          "url" in uploadResult
        ) {
          const result = uploadResult as {
            url: string;
            filename: string;
            type: string;
            key?: string;
          };
          uploadedMedia.push({
            url: result.url,
            filename: result.filename,
            type: result.type,
            caption: mediaCaptions[i] || "",
            key: result.key,
          });
        } else {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      // Add media to the task
      const response = await fetch(`/api/tasks/${mediaTask.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media: uploadedMedia,
          userId: user.id,
          userRole: user.role,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks((prev) =>
          prev.map((task) =>
            task.id === mediaTask.id
              ? {
                  ...data.task,
                  status: data.task.status.toLowerCase().replace("_", "-"),
                }
              : task
          )
        );
        setShowAddMediaDialog(false);
        setMediaTask(null);
        setSelectedFiles([]);
        setMediaCaptions([]);
        setUploadProgress([]);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to add media");
      }
    } catch (error) {
      console.error("Failed to add media:", error);
      alert(error instanceof Error ? error.message : "Failed to add media");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRemoveMedia = (
    taskId: string,
    mediaId: string,
    filename: string
  ) => {
    setRemovingMedia({ taskId, mediaId, filename });
    setShowRemoveMediaAlert(true);
  };

  const confirmRemoveMedia = async () => {
    if (!removingMedia) return;

    try {
      const response = await fetch(
        `/api/tasks/${removingMedia.taskId}/media?mediaId=${removingMedia.mediaId}&userId=${user.id}&userRole=${user.role}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks((prev) =>
          prev.map((task) =>
            task.id === removingMedia.taskId
              ? {
                  ...data.task,
                  status: data.task.status.toLowerCase().replace("_", "-"),
                }
              : task
          )
        );
        setShowRemoveMediaAlert(false);
        setRemovingMedia(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to remove media");
      }
    } catch (error) {
      console.error("Failed to remove media:", error);
      alert("Failed to remove media");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    return "bg-gray-300";
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "NORMAL":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "LOW":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const renderMediaItem = (
    media: any,
    className: string = "w-full h-20 sm:h-24 object-cover rounded"
  ) => {
    const isDocument =
      media.type === "application/pdf" ||
      media.type === "application/msword" ||
      media.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      media.type.startsWith("text/") ||
      media.type === "application/postscript" ||
      media.filename.toLowerCase().endsWith(".ai");

    if (isDocument) {
      return media.key ? (
        <SecureDocument
          documentKey={media.key}
          filename={media.filename}
          className={className}
          type={media.type}
        />
      ) : (
        <div
          className={`${className} cursor-pointer hover:opacity-90 transition-all group relative overflow-hidden`}
          onClick={() => window.open(media.url, "_blank")}
        >
          {media.type === "application/pdf" ? (
            <div className="w-full h-full bg-red-50 border border-red-200 rounded flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-200 opacity-50"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-10 bg-white border border-red-300 rounded shadow-sm mb-2 relative">
                  <div className="absolute top-1 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
                  <div className="absolute top-2.5 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
                  <div className="absolute top-4 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
                  <div className="absolute bottom-1 right-1 text-[6px] font-bold text-red-500">
                    PDF
                  </div>
                </div>
              </div>
            </div>
          ) : media.type === "application/postscript" ||
            media.filename.toLowerCase().endsWith(".ai") ? (
            <div className="w-full h-full bg-orange-50 border border-orange-200 rounded flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-200 opacity-50"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-10 bg-white border border-orange-300 rounded shadow-sm mb-2 relative">
                  <div className="absolute inset-1 bg-gradient-to-br from-orange-200 to-orange-300 rounded-sm"></div>
                  <div className="absolute bottom-1 right-1 text-[6px] font-bold text-orange-600">
                    AI
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-blue-50 border border-blue-200 rounded flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 opacity-50"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-10 bg-white border border-blue-300 rounded shadow-sm mb-2 relative">
                  <div className="absolute top-1 left-1 right-1 h-0.5 bg-blue-300 rounded"></div>
                  <div className="absolute top-2.5 left-1 right-1 h-0.5 bg-blue-300 rounded"></div>
                  <div className="absolute top-4 left-1 right-1 h-0.5 bg-blue-300 rounded"></div>
                  <div className="absolute bottom-1 right-1 text-[6px] font-bold text-blue-500">
                    DOC
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
            {media.filename}
          </div>
        </div>
      );
    } else if (media.type.startsWith("image/")) {
      return media.key ? (
        <SecureImage
          imageKey={media.key}
          alt={media.filename}
          className={className}
          fallback={
            <div
              className={`${className} bg-gray-100 flex items-center justify-center`}
            >
              <span className="text-xs text-gray-500">Loading...</span>
            </div>
          }
        />
      ) : (
        <img
          src={media.url || "/placeholder.svg"}
          alt={media.filename}
          className={className}
        />
      );
    } else if (media.type.startsWith("video/")) {
      return media.key ? (
        <SecureVideo
          videoKey={media.key}
          filename={media.filename}
          className={className}
        />
      ) : (
        <video
          src={media.url}
          className={className}
          controls
          preload="metadata"
        />
      );
    } else {
      // Fallback for other file types
      return media.key ? (
        <SecureDocument
          documentKey={media.key}
          filename={media.filename}
          className={className}
          type={media.type}
        />
      ) : (
        <div
          className={`${className} cursor-pointer hover:opacity-90 transition-all group relative overflow-hidden`}
          onClick={() => window.open(media.url, "_blank")}
        >
          <div className="w-full h-full bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 opacity-50"></div>
            <div className="relative z-10 flex flex-col items-center">
              <FileText className="h-6 w-6 text-gray-500 mb-1" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
            {media.filename}
          </div>
        </div>
      );
    }
  };

  const getPriorityIcon = (priority?: string) => {
    if (priority === "URGENT") {
      return <AlertTriangle className="h-3 w-3 mr-1" />;
    }
    return null;
  };

  const isTaskOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString();
    }
  };

  // Sort tasks: URGENT first, then by due date, then by creation date
  const sortedTasks = tasks.sort((a, b) => {
    // First, sort by priority (URGENT first)
    if (a.priority === "URGENT" && b.priority !== "URGENT") return -1;
    if (b.priority === "URGENT" && a.priority !== "URGENT") return 1;

    // Then by due date (overdue first, then soonest due date)
    if (a.dueDate && b.dueDate) {
      const aOverdue = isTaskOverdue(a.dueDate);
      const bOverdue = isTaskOverdue(b.dueDate);

      if (aOverdue && !bOverdue) return -1;
      if (bOverdue && !aOverdue) return 1;

      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    if (a.dueDate && !b.dueDate) return -1;
    if (b.dueDate && !a.dueDate) return 1;

    // Finally by creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Today's Tasks
          </h2>
          <p className="text-gray-300 text-sm sm:text-base">
            Manage your tasks for {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2">
          <Button
            variant="outline"
            onClick={fetchTasks}
            disabled={loading}
            className="w-full sm:w-auto"
            title="Refresh tasks"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          {user.role !== "bk" && (
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[80vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                  <DialogDescription>
                    Create a new task for today
                  </DialogDescription>
                </DialogHeader>
                <TaskForm type="daily" onSubmit={handleTaskSubmit} />
              </DialogContent>
            </Dialog>
          )}

          <Button
            variant="outline"
            onClick={handleShowPreviousTasks}
            className="relative w-full sm:w-auto"
          >
            Continue Previous Task
            {hasPreviousTasks && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0">
                !
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tasks for today
            </h3>
            <p className="text-gray-600 mb-4">
              {user.role === "bk"
                ? "No tasks are available for viewing today."
                : "Start by creating your first task for today."}
            </p>
            {user.role !== "bk" && (
              <Button onClick={() => setShowAddTask(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedTasks.map((task) => (
            <Card
              key={task.id}
              className={
                task.priority === "URGENT" ? "border-red-200 shadow-md" : ""
              }
            >
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <CardTitle className="text-base sm:text-lg">
                        {task.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {task.priority && (
                          <Badge
                            className={getPriorityColor(task.priority)}
                            variant="outline"
                          >
                            {getPriorityIcon(task.priority)}
                            {task.priority}
                          </Badge>
                        )}
                        {task.assignedBy && (
                          <Badge variant="secondary" className="text-xs">
                            Assigned by {task.assignedBy.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {task.continuedFromTask && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        ↳ Continued from: "{task.continuedFromTask.title}"
                      </p>
                    )}
                    <CardDescription className="mt-1 text-sm ">
                      <CollapsibleDescription
                        description={task.description}
                        createdAt={task.createdAt}
                      />
                    </CardDescription>
                    {task.dueDate && (
                      <div
                        className={`flex items-center space-x-1 mt-2 text-sm ${
                          isTaskOverdue(task.dueDate)
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        <span>
                          Due: {formatDueDate(task.dueDate)}
                          {isTaskOverdue(task.dueDate) && " (Overdue)"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-start sm:justify-end gap-1 sm:space-x-2">
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace("-", " ")}
                    </Badge>

                    {/* Show different buttons based on whether task is assigned by manager and user role */}
                    {(user.role === "manager" ||
                      (!task.assignedBy && user.role === "staff")) && (
                      // Full access for managers or staff's own tasks (BK excluded)
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTask(task)}
                          title="Edit task"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task)}
                          title={
                            task.assignedBy
                              ? "Delete assigned task"
                              : "Delete task"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {/* Show indicator for assigned tasks that staff can only update progress on */}
                    {task.assignedBy && user.role === "staff" && (
                      <Badge
                        variant="outline"
                        className="text-xs text-blue-600 border-blue-200"
                      >
                        Assigned Task
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-gray-600">
                        {task.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getProgressColor(
                          task.progress
                        )}`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  {task.notes && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Notes</h4>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        <FormattedText
                          content={task.notes}
                          className="text-sm text-gray-600"
                        />
                      </div>
                    </div>
                  )}

                  {task.media.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Attached Media
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {task.media.map((file, index) => (
                          <div key={index} className="space-y-2">
                            <div className="relative group">
                              {renderMediaItem(
                                file,
                                file.type.startsWith("video/")
                                  ? "w-full aspect-video object-cover rounded"
                                  : "w-full h-20 sm:h-24 object-cover rounded"
                              )}
                              {/* Remove button overlay */}
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                onClick={() =>
                                  handleRemoveMedia(
                                    task.id,
                                    file.id,
                                    file.filename
                                  )
                                }
                                title="Remove media"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium truncate">
                                {file.filename}
                              </p>
                              {file.caption && (
                                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded leading-relaxed">
                                  {file.caption}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddMedia(task)}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add Media
                    </Button>

                    {/* Always show progress update */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateProgress(task)}
                      className="w-full sm:w-auto"
                    >
                      Update Progress
                    </Button>

                    {/* Show add notes button for all tasks */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddNotes(task)}
                      className="w-full sm:w-auto"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Add Notes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={showEditTask} onOpenChange={setShowEditTask}>
        <DialogContent className="w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update your task details</DialogDescription>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              type="daily"
              onSubmit={handleTaskUpdate}
              initialData={{
                title: editingTask.title,
                description: editingTask.description,
                progress: editingTask.progress,
                notes: editingTask.notes,
                media: editingTask.media,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTask?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteAlert(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Update Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="w-[80vw]">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>
              Update the progress for "{updatingTask?.title}"
              {updatingTask?.assignedBy && user.role === "staff" && (
                <span className="block mt-1 text-sm text-blue-600">
                  This task was assigned by {updatingTask.assignedBy.name}. You
                  can update progress and add notes.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="progress">Progress Percentage</Label>
              <div className="space-y-3">
                <Slider
                  value={[newProgress]}
                  onValueChange={(value) =>
                    setNewProgress(Math.round(value[0]))
                  }
                  max={100}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
                <Input
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={newProgress}
                  onChange={(e) =>
                    setNewProgress(
                      Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                    )
                  }
                  className="w-full"
                  placeholder="Enter progress (0-100)"
                />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              {/* Rest stays the same */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">
                    Current progress:{" "}
                    <span className="font-medium">
                      {updatingTask?.progress}%
                    </span>
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(
                        updatingTask?.progress || 0
                      )}`}
                      style={{ width: `${updatingTask?.progress || 0}%` }}
                    />
                  </div>
                </div>
                {newProgress !== (updatingTask?.progress || 0) && (
                  <div>
                    <p className="text-sm text-gray-600">
                      New progress:{" "}
                      <span className="font-medium">{newProgress}%</span>
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full transition-all ${getProgressColor(
                          newProgress
                        )}`}
                        style={{ width: `${newProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {newProgress === 100 && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700 font-medium">
                    ✓ Task will be marked as completed
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProgressDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmProgressUpdate}>Update Progress</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Notes Dialog */}
      <Dialog open={showAddNotesDialog} onOpenChange={setShowAddNotesDialog}>
        <DialogContent className="w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Notes</DialogTitle>
            <DialogDescription>
              Add or update notes for "{notesTask?.title}"
              {notesTask?.assignedBy && (
                <span className="block mt-1 text-sm text-blue-600">
                  This task was assigned by {notesTask.assignedBy.name}. You can
                  add notes and update progress.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-notes">Notes</Label>
              <RichTextEditor
                value={newNotes}
                onChange={setNewNotes}
                rows={6}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                You can add notes to track your progress, questions, or any
                relevant information about this assigned task.
              </p>
            </div>
            {notesTask?.notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Current Notes:
                </h5>
                <div className="text-sm text-gray-600">
                  <FormattedText
                    content={notesTask.notes}
                    className="text-sm text-gray-600"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddNotesDialog(false)}
              disabled={isSubmittingNotes}
            >
              Cancel
            </Button>
            <Button onClick={confirmAddNotes} disabled={isSubmittingNotes}>
              {isSubmittingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Media Dialog */}
      <Dialog open={showAddMediaDialog} onOpenChange={setShowAddMediaDialog}>
        <DialogContent className="w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Media</DialogTitle>
            <DialogDescription>
              Add images, videos, or other files to "{mediaTask?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* File Selection Area */}
            <div className="space-y-2">
              <Label htmlFor="media-files">Select Files</Label>
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
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {isDragOver
                      ? "Drop files here"
                      : selectedFiles.length > 0
                      ? "Add more files here"
                      : "Drag & drop files here"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedFiles.length > 0
                      ? "or click to add more files"
                      : "or click to browse files"}
                  </p>
                  <Input
                    id="media-files"
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.ai"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isCompressing}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("media-files")?.click()
                    }
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
                <p className="text-xs text-gray-500 mt-4">
                  Supported formats: images, videos, audio, PDF, Word documents,
                  text files, AI files
                </p>
              </div>
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
              <div className="space-y-4">
                <h4 className="text-sm font-medium">
                  Selected Files ({selectedFiles.length})
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : file.type === "application/pdf" ? (
                            <div className="w-12 h-12 bg-red-50 border border-red-200 rounded flex items-center justify-center">
                              <FileText className="h-6 w-6 text-red-500" />
                            </div>
                          ) : file.type === "application/msword" ||
                            file.type ===
                              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? (
                            <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded flex items-center justify-center">
                              <FileText className="h-6 w-6 text-blue-500" />
                            </div>
                          ) : file.type === "application/postscript" ||
                            file.name.toLowerCase().endsWith(".ai") ? (
                            <div className="w-12 h-12 bg-orange-50 border border-orange-200 rounded flex items-center justify-center">
                              <FileText className="h-6 w-6 text-orange-500" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <Upload className="h-6 w-6 text-gray-400" />
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
                          <div className="mt-2">
                            <Label
                              htmlFor={`caption-${index}`}
                              className="text-xs"
                            >
                              Caption (optional)
                            </Label>
                            <Input
                              id={`caption-${index}`}
                              type="text"
                              placeholder="Add a caption for this file..."
                              value={mediaCaptions[index] || ""}
                              onChange={(e) =>
                                handleCaptionChange(index, e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                          {/* Upload progress bar */}
                          {isUploadingMedia && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-blue-500 transition-all"
                                  style={{
                                    width: `${uploadProgress[index] || 0}%`,
                                  }}
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {uploadProgress[index] || 0}%
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSelectedFile(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          type="button"
                          disabled={isUploadingMedia}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddMediaDialog(false)}
              disabled={isUploadingMedia || isCompressing}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAddMedia}
              disabled={
                isUploadingMedia || isCompressing || selectedFiles.length === 0
              }
            >
              {isCompressing
                ? "Compressing Images..."
                : isUploadingMedia
                ? "Uploading..."
                : `Upload ${selectedFiles.length} File(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Previous Tasks Selection Dialog */}
      <Dialog
        open={showPreviousTasksDialog}
        onOpenChange={setShowPreviousTasksDialog}
      >
        <DialogContent className="w-[80vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Continue Previous Task</DialogTitle>
            <DialogDescription>
              Select an incomplete task to continue working on today
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingPreviousTasks ? (
              <div className="grid gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : previousTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No incomplete tasks found</p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {previousTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          {task.continuedFromTask && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              ↳ Continued from: "{task.continuedFromTask.title}"
                            </p>
                          )}
                          <div className="mt-1">
                            <FormattedText
                              content={task.description}
                              className="text-sm text-gray-600"
                            />
                          </div>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                Progress:
                              </span>
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${getProgressColor(
                                    task.progress
                                  )}`}
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {task.progress}%
                              </span>
                            </div>
                            <Badge
                              className={getStatusColor(task.status)}
                              variant="secondary"
                            >
                              {task.status.replace("-", " ")}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleContinueTask(task)}
                          className="ml-4"
                        >
                          Continue Today
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreviousTasksDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Media Confirmation Alert */}
      <AlertDialog
        open={showRemoveMediaAlert}
        onOpenChange={setShowRemoveMediaAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{removingMedia?.filename}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRemoveMediaAlert(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMedia}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
