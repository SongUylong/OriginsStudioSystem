"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, FileText, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";

interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  type: string;
  caption?: string;
  key?: string;
  private?: boolean;
}

interface WeeklySummary {
  id: string;
  title: string;
  summary: string;
  weekStartDate: string;
  weekEndDate: string;
  media: Array<{
    id: string;
    url: string;
    filename: string;
    type: string;
    description: string;
    uploadedAt: string;
  }>;
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface WeeklyFeedbackDialogProps {
  summary: WeeklySummary | null;
  staffMember: StaffMember | null;
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}

export function WeeklyFeedbackDialog({
  summary,
  staffMember,
  open,
  onClose,
  onSubmit,
}: WeeklyFeedbackDialogProps) {
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { getCurrentUserId } = useAuth();

  const removeFile = (indexToRemove: number) => {
    setUploadedFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleUploadStateChange = (uploading: boolean) => {
    setIsUploading(uploading);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || !staffMember) return;

    setIsSubmitting(true);

    const feedbackData = {
      feedbackText,
      type: "weekly",
      summaryId: summary.id,
      staffId: staffMember.id,
      media: uploadedFiles.map((file) => ({
        url: file.url,
        filename: file.filename,
        type: file.type,
        caption: file.caption || null,
        key: file.key || null,
      })),
    };

    try {
      if (onSubmit) {
        await onSubmit(feedbackData);
      } else {
        // Default API call if no onSubmit provided
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: feedbackText,
            type: "weekly",
            staffId: staffMember.id,
            managerId: getCurrentUserId(),
            weeklySummaryId: summary.id,
            media: uploadedFiles.map((file) => ({
              url: file.url,
              filename: file.filename,
              type: file.type,
              caption: file.caption || null,
              key: file.key || null,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to submit feedback");
        }
      }

      // Reset form
      setFeedbackText("");
      setUploadedFiles([]);
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      setIsSubmitting(false);
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const end = new Date(endDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${start} - ${end}`;
  };

  if (!summary || !staffMember) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Weekly Feedback</DialogTitle>
          <DialogDescription>
            Provide feedback for {staffMember.name} on their weekly summary: "
            {summary.title}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="feedback-text">Feedback</Label>
            <Textarea
              id="feedback-text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Provide detailed feedback on the weekly summary, work quality, achievements, and areas for improvement..."
              rows={6}
              required
              className="max-w-[350px] md:max-w-[450px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Attach Files (Optional)</Label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
              <EnhancedFileUpload
                onFilesUploaded={setUploadedFiles}
                onUploadStateChange={handleUploadStateChange}
                maxFiles={5}
                maxSize={10}
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
                userId={getCurrentUserId()}
                isPrivate={true}
                multiple={true}
                disabled={isSubmitting || isUploading}
              />
              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    {uploadedFiles.length} file
                    {uploadedFiles.length !== 1 ? "s" : ""} attached
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 bg-gray-50 rounded p-2 text-sm border"
                      >
                        <Upload className="h-3 w-3 text-gray-500" />
                        <span className="truncate max-w-[150px]">
                          {file.filename}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="flex items-center justify-center h-4 w-4 rounded-full bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-colors"
                          title="Remove file"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isUploading
                ? "Uploading files..."
                : isSubmitting
                ? "Submitting..."
                : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
