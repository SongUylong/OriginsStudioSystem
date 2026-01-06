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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Search, FileTextIcon, DownloadIcon } from "lucide-react";
import { format } from "date-fns";
import { FormattedText } from "@/components/ui/formatted-text";
import { SecureImage } from "@/components/secure-image";
import { SecureDocument } from "@/components/secure-document";
import { SecureVideo } from "@/components/secure-video";

// CollapsibleDescription component
interface CollapsibleDescriptionProps {
  description: string;
  createdAt: string;
}

function CollapsibleDescription({
  description,
  createdAt,
}: CollapsibleDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 50;
  const isLong = description.length > maxLength;

  // Check if task was created today or later
  const taskDate = new Date(createdAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  const isFromToday = taskDate >= today;

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
  media: Array<{
    url: string;
    filename: string;
    type: string;
    caption?: string;
    key?: string;
  }>;
}

interface PreviousTasksProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "staff" | "manager" | "bk";
    avatar?: string;
  };
}

export function PreviousTasks({ user }: PreviousTasksProps) {
  // Calculate yesterday's date
  const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  };

  const renderMediaItem = (
    media: any,
    className: string = "w-full h-20 object-cover rounded"
  ) => {
    // Images: Show preview
    if (media.type.startsWith("image/")) {
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
    }

    // PDFs: Open in new tab
    if (media.type === "application/pdf") {
      const handleClick = () => {
        if (media.key) {
          // For secure PDFs, get signed URL first
          fetch(`/api/private-image?key=${encodeURIComponent(media.key)}`)
            .then((res) => res.json())
            .then((data) => window.open(data.url, "_blank"))
            .catch((err) => console.error("Error opening PDF:", err));
        } else {
          window.open(media.url, "_blank");
        }
      };

      return (
        <div
          className={`${className} cursor-pointer hover:opacity-90 transition-all group relative overflow-hidden`}
          onClick={handleClick}
        >
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
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
            {media.filename}
          </div>
        </div>
      );
    }

    // Videos: Show video player
    if (media.type.startsWith("video/")) {
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
    }

    // Other documents (.doc, .ai, etc.): Download
    const handleDownload = () => {
      if (media.key) {
        // For secure files, get signed URL first
        fetch(`/api/private-image?key=${encodeURIComponent(media.key)}`)
          .then((res) => res.json())
          .then((data) => {
            const link = document.createElement("a");
            link.href = data.url;
            link.download = media.filename;
            link.click();
          })
          .catch((err) => console.error("Error downloading file:", err));
      } else {
        const link = document.createElement("a");
        link.href = media.url;
        link.download = media.filename;
        link.click();
      }
    };

    // Show appropriate placeholder based on file type
    let bgColor = "bg-gray-50 border-gray-200";
    let iconColor = "text-gray-500";
    let label = "FILE";

    if (
      media.type === "application/msword" ||
      media.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      bgColor = "bg-blue-50 border-blue-200";
      iconColor = "text-blue-500";
      label = "DOC";
    } else if (
      media.type === "application/postscript" ||
      media.filename.toLowerCase().endsWith(".ai")
    ) {
      bgColor = "bg-orange-50 border-orange-200";
      iconColor = "text-orange-500";
      label = "AI";
    }

    return (
      <div
        className={`${className} cursor-pointer hover:opacity-90 transition-all group relative overflow-hidden`}
        onClick={handleDownload}
      >
        <div
          className={`w-full h-full ${bgColor} border rounded flex flex-col items-center justify-center relative overflow-hidden`}
        >
          <div className="relative z-10 flex flex-col items-center">
            <DownloadIcon className={`h-6 w-6 ${iconColor} mb-1`} />
            <span className={`text-[8px] font-bold ${iconColor}`}>{label}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
          {media.filename}
        </div>
      </div>
    );
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getYesterday());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch tasks for the selected date
  useEffect(() => {
    const fetchTasksForDate = async () => {
      setLoading(true);
      try {
        const dateString = format(selectedDate, "yyyy-MM-dd");
        const response = await fetch(
          `/api/tasks?staffId=${user.id}&date=${dateString}`
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
        console.error("Failed to fetch previous tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasksForDate();
  }, [selectedDate, user.id]);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-white">Previous Tasks</h2>
        <p className="text-gray-300">
          Select a date to view your task history and progress
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Select Date
          </CardTitle>
          <CardDescription>
            Choose a date to view your tasks for that day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                    }
                  }}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Tasks for {format(selectedDate, "MMMM d, yyyy")}
            </h3>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="border-white/30 text-white">
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </Badge>
              {tasks.length > 0 && (
                <Badge variant="secondary" className="bg-[#ff7a30] text-white">
                  {tasks.filter((t) => t.status === "completed").length}{" "}
                  completed
                </Badge>
              )}
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
          ) : tasks.length > 0 ? (
            <div className="grid gap-4">
              {tasks.map((task: Task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        <CardDescription className="mt-1">
                          <CollapsibleDescription
                            description={task.description}
                            createdAt={task.createdAt}
                          />
                        </CardDescription>
                        <p className="text-xs text-gray-500 mt-1">
                          Created:{" "}
                          {new Date(task.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace("-", " ")}
                        </Badge>
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
                          <div className="grid grid-cols-3 gap-2">
                            {task.media.map((file: any, index: number) => (
                              <div key={index} className="relative">
                                {renderMediaItem(
                                  file,
                                  file.type.startsWith("video/")
                                    ? "w-full aspect-video object-cover rounded"
                                    : "w-full h-20 object-cover rounded"
                                )}
                                {file.caption && (
                                  <div className="mt-1">
                                    <p className="text-xs text-gray-600 bg-gray-50 p-1 rounded text-center">
                                      {file.caption}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tasks found
                </h3>
                <p className="text-gray-600">
                  No tasks were recorded for this date
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!selectedDate && (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select a date
            </h3>
            <p className="text-gray-600">
              Choose a date from the calendar above to view your previous tasks
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
