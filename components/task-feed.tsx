"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  MessageSquare,
  Calendar,
  User,
  Building2,
  Clock,
  CheckCircle2,
  Edit,
  Trash2,
  Eye,
  Filter,
  CalendarDays,
  Users,
  FileTextIcon,
  DownloadIcon,
} from "lucide-react";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { SecureImage } from "@/components/secure-image";
import { SecureDocument } from "@/components/secure-document";
import { SecureVideo } from "@/components/secure-video";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePickerButton } from "@/components/ui/date-picker-button";
import { toast } from "sonner";
import { FormattedText } from "@/components/ui/formatted-text";

interface Task {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  createdAt: string;
  dueDate?: string;
  notes?: string;
  staff: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    avatarKey?: string;
    department?: string;
  };
  assignedBy?: {
    id: string;
    name: string;
    email: string;
  };
  media: Array<{
    id: string;
    url: string;
    filename: string;
    type: string;
    caption?: string;
    key?: string;
  }>;
  feedback: Array<{
    id: string;
    content: string;
    type: string;
    createdAt: string;
    manager: {
      id: string;
      name: string;
      avatar?: string;
      avatarKey?: string;
    };
    media: Array<{
      id: string;
      url: string;
      filename: string;
      type: string;
      caption?: string;
      key?: string;
    }>;
  }>;
}

interface FeedbackEditData {
  id: string;
  content: string;
  taskId: string;
}

export function TaskFeed() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [feedbackTask, setFeedbackTask] = useState<Task | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] =
    useState<FeedbackEditData | null>(null);
  const [showEditFeedbackDialog, setShowEditFeedbackDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const { getCurrentUserId } = useAuth();

  useEffect(() => {
    fetchTasks();
    fetchStaffList();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allTasks, selectedStaff, selectedDate]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tasks/feed");
      if (response.ok) {
        const data = await response.json();
        setAllTasks(data.tasks);
      } else {
        console.error("Failed to fetch tasks");
        toast.error("Failed to load task feed");
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Error loading task feed");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setStaffList(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching staff list:", error);
    }
  };

  const applyFilters = () => {
    let filteredTasks = [...allTasks];

    // Filter by staff
    if (selectedStaff !== "all") {
      filteredTasks = filteredTasks.filter(
        (task) => task.staff.id === selectedStaff
      );
    }

    // Filter by date
    if (selectedDate) {
      filteredTasks = filteredTasks.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate.toDateString() === selectedDate.toDateString();
      });
    }

    setTasks(filteredTasks);
  };

  const handleFeedbackSubmit = async (feedbackData: any) => {
    if (!feedbackTask) return;

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: feedbackData.feedbackText,
          type: "daily",
          staffId: feedbackTask.staff.id,
          managerId: getCurrentUserId(),
          taskId: feedbackTask.id,
          media: feedbackData.media || [],
        }),
      });

      if (response.ok) {
        toast.success("Feedback submitted successfully");
        // Refresh tasks to get updated feedback
        fetchTasks();
        setFeedbackTask(null);
        setShowFeedbackDialog(false);
      } else {
        toast.error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Error submitting feedback");
    }
  };

  const handleEditFeedback = (feedback: any, taskId: string) => {
    setEditingFeedback({
      id: feedback.id,
      content: feedback.content,
      taskId,
    });
    setShowEditFeedbackDialog(true);
  };

  const handleUpdateFeedback = async () => {
    if (!editingFeedback) return;

    try {
      const response = await fetch(`/api/feedback/${editingFeedback.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: editingFeedback.content,
        }),
      });

      if (response.ok) {
        toast.success("Feedback updated successfully");
        fetchTasks();
        setEditingFeedback(null);
        setShowEditFeedbackDialog(false);
      } else {
        toast.error("Failed to update feedback");
      }
    } catch (error) {
      console.error("Failed to update feedback:", error);
      toast.error("Error updating feedback");
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Feedback deleted successfully");
        fetchTasks();
      } else {
        toast.error("Failed to delete feedback");
      }
    } catch (error) {
      console.error("Failed to delete feedback:", error);
      toast.error("Error deleting feedback");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-500 text-white";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "NORMAL":
        return "bg-blue-500 text-white";
      case "LOW":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderMediaItem = (
    media: any,
    className: string = "w-full h-24 object-cover rounded-lg"
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
          alt={media.caption || media.filename}
          className={className}
        />
      ) : (
        <img
          src={media.url}
          alt={media.caption || media.filename}
          className={className}
        />
      );
    } else if (media.type.startsWith("video/")) {
      // For private videos, we need to get the signed URL first
      if (media.key) {
        return (
          <SecureVideo
            videoKey={media.key}
            className={className}
            filename={media.filename}
          />
        );
      } else {
        return (
          <video
            src={media.url}
            className={className}
            controls
            preload="metadata"
          />
        );
      }
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
          className={`${className} bg-white/10 border border-white/20 flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-white/20 transition-colors`}
          onClick={() => window.open(media.url, "_blank")}
        >
          <DownloadIcon className="h-6 w-6 text-white/70 mb-1" />
          <span className="text-xs text-white/70 text-center truncate w-full">
            {media.filename}
          </span>
        </div>
      );
    }
  };

  const groupTasksByDateAndStaff = (tasks: Task[]) => {
    const grouped: { [date: string]: { [staffName: string]: Task[] } } = {};

    tasks.forEach((task) => {
      const dateKey = new Date(task.createdAt).toDateString();
      const staffName = task.staff.name;

      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }

      if (!grouped[dateKey][staffName]) {
        grouped[dateKey][staffName] = [];
      }

      grouped[dateKey][staffName].push(task);
    });

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    const result: {
      date: string;
      staffGroups: { staffName: string; tasks: Task[] }[];
    }[] = [];

    sortedDates.forEach((date) => {
      const staffNames = Object.keys(grouped[date]).sort();
      const staffGroups = staffNames.map((staffName) => ({
        staffName,
        tasks: grouped[date][staffName].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }));

      result.push({
        date,
        staffGroups,
      });
    });

    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading task feed...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="sm:flex items-center space-x-2 hidden ">
            <Filter className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <DatePickerButton
              date={selectedDate}
              onDateChange={(date) => setSelectedDate(date)}
              placeholder="All Dates"
              className="sm:min-w-[180px] min-w-[180px] bg-white/10 border-white/20 text-white hover:bg-white/15"
            />
          </div>
          {/* Staff Filter */}
          <div className="flex items-center space-x-2">
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="sm:w-[180px] w-[120px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem
                  value="all"
                  className="text-white hover:bg-gray-800"
                >
                  All Staff
                </SelectItem>
                {staffList.map((staff) => (
                  <SelectItem
                    key={staff.id}
                    value={staff.id}
                    className="text-white hover:bg-gray-800"
                  >
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 text-center">
            <p className="text-white/70">No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupTasksByDateAndStaff(tasks).map((dateGroup) => (
            <div key={dateGroup.date} className="space-y-6">
              <h1 className="text-3xl font-bold text-white border-b border-white/20 pb-2">
                {formatDateOnly(dateGroup.date)}
              </h1>

              {dateGroup.staffGroups.map((staffGroup) => (
                <div key={staffGroup.staffName} className="space-y-4">
                  <h2 className="text-xl font-semibold text-orange-500 ml-2 underline decoration-orange-500 underline-offset-5">
                    {staffGroup.staffName}
                  </h2>

                  <div className="grid gap-4">
                    {staffGroup.tasks.map((task) => (
                      <Card
                        key={task.id}
                        className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200"
                      >
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-white text-lg">
                                  {task.title}
                                </CardTitle>
                                <Badge
                                  className={getPriorityColor(task.priority)}
                                >
                                  {task.priority}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-white/70 mb-3">
                                {task.staff.department && (
                                  <div className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    {task.staff.department}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {formatDate(task.createdAt)}
                                </div>
                              </div>

                              <CardDescription className="text-white/80 mb-4">
                                <FormattedText
                                  content={task.description}
                                  className="text-white/80"
                                />
                              </CardDescription>

                              {task.notes && (
                                <div className="mb-4 p-3 bg-white/5 rounded-lg">
                                  <div className="text-sm text-white/70">
                                    <strong>Notes:</strong>{" "}
                                    <FormattedText
                                      content={task.notes}
                                      className="text-white/70"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Avatar className="h-10 w-10">
                                {task.staff.avatarKey ? (
                                  <SecureImage
                                    imageKey={task.staff.avatarKey}
                                    alt={task.staff.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : task.staff.avatar ? (
                                  <AvatarImage
                                    src={task.staff.avatar}
                                    alt={task.staff.name}
                                  />
                                ) : (
                                  <AvatarFallback className="bg-white/20 text-white">
                                    {task.staff.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/70">
                                Progress
                              </span>
                              <span className="text-sm font-medium text-white">
                                {task.progress}%
                              </span>
                            </div>
                            <Progress value={task.progress} className="h-2" />
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Media Display */}
                          {task.media.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-white/80">
                                Media
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {task.media.slice(0, 6).map((media) => (
                                  <div key={media.id} className="relative">
                                    {renderMediaItem(
                                      media,
                                      media.type.startsWith("video/")
                                        ? "w-full aspect-video object-cover rounded-lg"
                                        : "w-full h-24 object-cover rounded-lg"
                                    )}
                                    {media.caption && (
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg">
                                        {media.caption}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {task.media.length > 6 && (
                                  <div className="flex items-center justify-center bg-white/10 rounded-lg h-24">
                                    <span className="text-white/70 text-sm">
                                      +{task.media.length - 6} more
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Feedback Section */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-white/80">
                                Feedback ({task.feedback.length})
                              </h4>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setFeedbackTask(task);
                                  setShowFeedbackDialog(true);
                                }}
                                className="bg-[#ff7a30] hover:bg-[#ff7a30]/80 text-white"
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Add Feedback
                              </Button>
                            </div>

                            {task.feedback.length > 0 && (
                              <div className="space-y-2">
                                {task.feedback
                                  .slice(
                                    0,
                                    expandedFeedback === task.id
                                      ? task.feedback.length
                                      : 2
                                  )
                                  .map((feedback) => (
                                    <div
                                      key={feedback.id}
                                      className="bg-white/5 rounded-lg p-3 space-y-2"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                            {feedback.manager.avatarKey ? (
                                              <SecureImage
                                                imageKey={
                                                  feedback.manager.avatarKey
                                                }
                                                alt={feedback.manager.name}
                                                className="h-6 w-6 rounded-full object-cover"
                                              />
                                            ) : feedback.manager.avatar ? (
                                              <AvatarImage
                                                src={feedback.manager.avatar}
                                                alt={feedback.manager.name}
                                              />
                                            ) : (
                                              <AvatarFallback className="bg-white/20 text-white text-xs">
                                                {feedback.manager.name
                                                  .split(" ")
                                                  .map((n) => n[0])
                                                  .join("")}
                                              </AvatarFallback>
                                            )}
                                          </Avatar>
                                          <div>
                                            <p className="text-xs text-white/70">
                                              {feedback.manager.name}
                                            </p>
                                            <p className="text-xs text-white/50">
                                              {formatDate(feedback.createdAt)}
                                            </p>
                                          </div>
                                        </div>

                                        {feedback.manager.id ===
                                          getCurrentUserId() && (
                                          <div className="flex items-center gap-1">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() =>
                                                handleEditFeedback(
                                                  feedback,
                                                  task.id
                                                )
                                              }
                                              className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() =>
                                                handleDeleteFeedback(
                                                  feedback.id
                                                )
                                              }
                                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>

                                      <p className="text-sm text-white/80">
                                        {feedback.content}
                                      </p>

                                      {feedback.media.length > 0 && (
                                        <div className="grid grid-cols-3 gap-1">
                                          {feedback.media.map((media) => (
                                            <div
                                              key={media.id}
                                              className="relative"
                                            >
                                              {renderMediaItem(
                                                media,
                                                media.type.startsWith("video/")
                                                  ? "w-full aspect-video object-cover rounded"
                                                  : "w-full h-16 object-cover rounded"
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                {task.feedback.length > 2 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setExpandedFeedback(
                                        expandedFeedback === task.id
                                          ? null
                                          : task.id
                                      )
                                    }
                                    className="text-white/60 hover:text-white hover:bg-white/10"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    {expandedFeedback === task.id
                                      ? "Show Less"
                                      : `Show ${task.feedback.length - 2} More`}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Feedback Dialog */}
      <FeedbackDialog
        task={feedbackTask}
        staffMember={feedbackTask?.staff || null}
        open={showFeedbackDialog}
        onClose={() => {
          setShowFeedbackDialog(false);
          setFeedbackTask(null);
        }}
        onSubmit={handleFeedbackSubmit}
      />

      {/* Edit Feedback Dialog */}
      <Dialog
        open={showEditFeedbackDialog}
        onOpenChange={setShowEditFeedbackDialog}
      >
        <DialogContent className="bg-[#1a1a1a] border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Edit Feedback</DialogTitle>
            <DialogDescription className="text-white/70">
              Update your feedback for this task.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback-content">Feedback Content</Label>
              <Textarea
                id="feedback-content"
                value={editingFeedback?.content || ""}
                onChange={(e) =>
                  setEditingFeedback((prev) =>
                    prev ? { ...prev, content: e.target.value } : null
                  )
                }
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditFeedbackDialog(false);
                  setEditingFeedback(null);
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateFeedback}
                className="bg-[#ff7a30] hover:bg-[#ff7a30]/80 text-white"
              >
                Update Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
