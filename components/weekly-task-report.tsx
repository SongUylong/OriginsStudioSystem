"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Calendar,
  Save,
  Image as ImageIcon,
  Download,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SecureImage } from "@/components/secure-image";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WeeklyMedia {
  id: string;
  url: string;
  filename: string;
  type: string;
  caption?: string;
  key?: string;
  uploadedAt: string;
  taskTitle: string;
  taskId: string;
}

interface WeeklyTaskReportProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "staff" | "manager" | "bk";
    avatar?: string;
  };
}

export function WeeklyTaskReport({ user }: WeeklyTaskReportProps) {
  const [weeklyMedia, setWeeklyMedia] = useState<WeeklyMedia[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<WeeklyMedia | null>(null);
  const [weekRange, setWeekRange] = useState({ start: "", end: "" });
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const { toast } = useToast();

  // Calculate week range based on offset
  const getWeekRange = (weekOffset: number = 0) => {
    const today = new Date();
    const currentDay = today.getDay();

    // Calculate Monday of the target week
    const monday = new Date(today);
    monday.setDate(
      today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + weekOffset * 7
    );

    // Calculate Sunday of the target week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  };

  useEffect(() => {
    const weekRange = getWeekRange(currentWeekOffset);
    setWeekRange(weekRange);
    fetchWeeklyData(weekRange);
  }, [user.id, currentWeekOffset]);

  const fetchWeeklyData = async (range: { start: string; end: string }) => {
    setLoading(true);
    setSummary(""); // Clear summary when loading new week
    try {
      // Fetch all tasks for the week
      const tasksResponse = await fetch(
        `/api/tasks?staffId=${user.id}&startDate=${range.start}&endDate=${range.end}`
      );

      if (!tasksResponse.ok) {
        throw new Error("Failed to fetch weekly tasks");
      }

      const tasksData = await tasksResponse.json();
      const tasks = Array.isArray(tasksData)
        ? tasksData
        : tasksData.tasks || [];

      // Extract all media from all tasks
      const allMedia: WeeklyMedia[] = [];
      tasks.forEach((task: any) => {
        if (task.media && Array.isArray(task.media)) {
          task.media.forEach((media: any) => {
            allMedia.push({
              id: `${task.id}-${media.filename}`,
              url: media.url,
              filename: media.filename,
              type: media.type,
              caption: media.caption,
              key: media.key,
              uploadedAt: task.createdAt,
              taskTitle: task.title,
              taskId: task.id,
            });
          });
        }
      });

      setWeeklyMedia(allMedia);

      // Fetch existing weekly summary if any
      const summaryUrl = `/api/weekly-summaries?staffId=${user.id}&startDate=${range.start}&endDate=${range.end}`;
      const summaryResponse = await fetch(summaryUrl);

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        if (
          summaryData.weeklySummaries &&
          summaryData.weeklySummaries.length > 0
        ) {
          setSummary(summaryData.weeklySummaries[0].summary || "");
        } else {
          setSummary(""); // Clear summary if no existing summary found
        }
      } else {
        console.error("Failed to fetch summary:", summaryResponse.status);
        setSummary(""); // Clear summary if request failed
      }
    } catch (error) {
      console.error("Error fetching weekly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveWeeklySummary = async () => {
    if (!summary.trim()) {
      toast({
        title: "Please enter a summary",
        description: "You need to write a summary before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/weekly-summaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: summary.trim(),
          startDate: weekRange.start,
          endDate: weekRange.end,
          staffId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error response:", errorData);
        throw new Error(errorData.error || "Failed to save weekly summary");
      }

      const result = await response.json();

      // Show success toast
      toast({
        title: "✅ Weekly Summary Saved",
        description: "Your weekly summary has been successfully saved!",
      });
    } catch (error) {
      console.error("Error saving weekly summary:", error);
      toast({
        title: "Failed to save",
        description: `Failed to save weekly summary: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentWeekOffset(currentWeekOffset - 1);
    } else if (direction === "next" && currentWeekOffset < 0) {
      setCurrentWeekOffset(currentWeekOffset + 1);
    }
  };

  const getWeekLabel = () => {
    if (currentWeekOffset === 0) return "This Week";
    if (currentWeekOffset === -1) return "Last Week";
    return `${Math.abs(currentWeekOffset)} weeks ago`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getMediaTypeIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Weekly Task Report
          </CardTitle>
          <CardDescription>
            Loading weekly task summary and media...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Weekly Task Report
            </CardTitle>
            <CardDescription className="flex items-center mt-2">
              <Calendar className="h-4 w-4 mr-2" />
              {getWeekLabel()} • {formatDate(weekRange.start)} -{" "}
              {formatDate(weekRange.end)}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek("prev")}
              className="flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek("next")}
              disabled={currentWeekOffset >= 0}
              className="flex items-center"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Summary Section */}
        <div className="space-y-3">
          <Label htmlFor="weekly-summary">Weekly Summary</Label>
          <Textarea
            id="weekly-summary"
            placeholder="Enter a summary of your weekly accomplishments, challenges, and key highlights..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="min-h-[120px] max-w-[350px] md:max-w-[450px]"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {summary.length}/1000 characters
            </span>
            <Button
              onClick={saveWeeklySummary}
              disabled={!summary.trim() || saving}
              className="flex items-center"
            >
              {saving ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? "Saving..." : "Save Summary"}
            </Button>
          </div>
        </div>

        {/* Weekly Statistics */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">
                Media Uploaded
              </span>
              <ImageIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {weeklyMedia.length}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Files uploaded this week
            </div>
          </div>
        </div>

        {/* Weekly Media Gallery */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Weekly Media Gallery</h3>
            <Badge variant="outline">{weeklyMedia.length} files</Badge>
          </div>

          {weeklyMedia.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No media uploaded this week</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {weeklyMedia.map((media) => (
                <div key={media.id} className="group relative">
                  {media.type.startsWith("image/") ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer rounded-lg overflow-hidden border hover:shadow-md transition-shadow">
                          {media.key ? (
                            <SecureImage
                              imageKey={media.key}
                              alt={media.filename}
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <img
                              src={media.url}
                              alt={media.filename}
                              className="w-full h-32 object-cover"
                            />
                          )}
                          <div className="p-2 bg-white">
                            <div className="flex items-center justify-between">
                              {getMediaTypeIcon(media.type)}
                              <span className="text-xs text-gray-500 truncate">
                                {media.filename}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              {media.taskTitle}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDate(media.uploadedAt)}
                            </p>
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="w-[80vw]">
                        <DialogHeader>
                          <DialogTitle>{media.filename}</DialogTitle>
                          <DialogDescription>
                            From task: {media.taskTitle} • Uploaded:{" "}
                            {formatDate(media.uploadedAt)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          {media.type.startsWith("image/") ? (
                            media.key ? (
                              <SecureImage
                                imageKey={media.key}
                                alt={media.filename}
                                className="w-full max-h-96 object-contain rounded-lg"
                              />
                            ) : (
                              <img
                                src={media.url}
                                alt={media.filename}
                                className="w-full max-h-96 object-contain rounded-lg"
                              />
                            )
                          ) : (
                            <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-lg">
                              <FileText className="h-16 w-16 text-gray-400" />
                            </div>
                          )}
                          {media.caption && (
                            <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                              <strong>Caption:</strong> {media.caption}
                            </p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div
                      className="cursor-pointer rounded-lg overflow-hidden border hover:shadow-md transition-shadow"
                      onClick={() => {
                        // PDFs: Open in new tab
                        if (media.type === "application/pdf") {
                          if (media.key) {
                            // For secure PDFs, get signed URL first
                            fetch(
                              `/api/private-image?key=${encodeURIComponent(
                                media.key
                              )}`
                            )
                              .then((res) => res.json())
                              .then((data) => window.open(data.url, "_blank"))
                              .catch((err) =>
                                console.error("Error opening PDF:", err)
                              );
                          } else {
                            window.open(media.url, "_blank");
                          }
                        } else {
                          // Other documents: Download
                          if (media.key) {
                            // For secure files, get signed URL first
                            fetch(
                              `/api/private-image?key=${encodeURIComponent(
                                media.key
                              )}`
                            )
                              .then((res) => res.json())
                              .then((data) => {
                                const link = document.createElement("a");
                                link.href = data.url;
                                link.download = media.filename;
                                link.click();
                              })
                              .catch((err) =>
                                console.error("Error downloading file:", err)
                              );
                          } else {
                            const link = document.createElement("a");
                            link.href = media.url;
                            link.download = media.filename;
                            link.click();
                          }
                        }
                      }}
                    >
                      <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                        {media.type === "application/pdf" ? (
                          <div className="text-center">
                            <FileText className="h-8 w-8 text-red-500 mx-auto mb-1" />
                            <span className="text-xs text-red-600 font-medium">
                              PDF
                            </span>
                          </div>
                        ) : media.type === "application/msword" ||
                          media.type ===
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? (
                          <div className="text-center">
                            <FileText className="h-8 w-8 text-blue-500 mx-auto mb-1" />
                            <span className="text-xs text-blue-600 font-medium">
                              DOC
                            </span>
                          </div>
                        ) : media.type === "application/postscript" ||
                          media.filename.toLowerCase().endsWith(".ai") ? (
                          <div className="text-center">
                            <FileText className="h-8 w-8 text-orange-500 mx-auto mb-1" />
                            <span className="text-xs text-orange-600 font-medium">
                              AI
                            </span>
                          </div>
                        ) : (
                          <FileText className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div className="p-2 bg-white">
                        <div className="flex items-center justify-between">
                          {getMediaTypeIcon(media.type)}
                          <span className="text-xs text-gray-500 truncate">
                            {media.filename}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {media.taskTitle}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(media.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
