"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  MessageSquare,
  ArrowLeft,
  Images,
  CalendarDays,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileTextIcon,
  DownloadIcon,
} from "lucide-react";
import { DatePickerButton } from "@/components/ui/date-picker-button";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { useAuth } from "@/hooks/use-auth";
import { SecureDocument } from "@/components/secure-document";
import { SecureVideo } from "@/components/secure-video";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, addDays, subDays } from "date-fns";
import { SecureImage } from "@/components/secure-image";
import { ClickableImage } from "@/components/clickable-image";
import { TaskForm } from "@/components/task-form";

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

interface StaffMember {
  id: string;
  name: string;
  email: string;
  department?: string;
  avatar?: string;
  avatarKey?: string;
  tasks: Task[];
}

interface ViewDailyTasksProps {
  initialSelectedStaffId?: string;
  initialSelectedStaffName?: string;
}

export function ViewDailyTasks({
  initialSelectedStaffId,
  initialSelectedStaffName,
}: ViewDailyTasksProps = {}) {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [feedbackTask, setFeedbackTask] = useState<Task | null>(null);
  const [selectedTaskMedia, setSelectedTaskMedia] = useState<Task | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [taskFeedback, setTaskFeedback] = useState<{ [taskId: string]: any[] }>(
    {}
  );
  const [viewTaskFeedback, setViewTaskFeedback] = useState<Task | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<any | null>(null);
  const [editFeedbackText, setEditFeedbackText] = useState<string>("");
  const [selectedFeedbackMedia, setSelectedFeedbackMedia] = useState<
    any | null
  >(null);

  // State for expandable descriptions
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set()
  );

  // New states for task editing and deletion
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [showDeleteTaskAlert, setShowDeleteTaskAlert] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const { getCurrentUserId, user: currentUser } = useAuth();

  // Helper functions for expandable descriptions
  const toggleDescription = (taskId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const isDescriptionExpanded = (taskId: string) => {
    return expandedDescriptions.has(taskId);
  };

  const shouldShowExpandButton = (text: string, maxLength: number = 50) => {
    return text && text.length > maxLength;
  };

  const renderExpandableText = (
    text: string,
    taskId: string,
    maxLength: number = 50,
    createdAt?: string
  ) => {
    if (!text) {
      // Check if this is a notes field
      if (taskId.includes("-notes")) {
        return <span className="text-sm text-gray-400 italic">No notes</span>;
      }
      return (
        <span className="text-sm text-gray-400 italic">No description</span>
      );
    }

    // Check if task was created today or later (only for descriptions, not notes)
    let isFromToday = false;
    if (createdAt && !taskId.includes("-notes")) {
      const taskDate = new Date(createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      isFromToday = taskDate >= today;
    }

    const isExpanded = isDescriptionExpanded(taskId);
    const shouldShow = shouldShowExpandButton(text, maxLength);

    if (!shouldShow) {
      return (
        <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">
          {isFromToday ? (
            <span className="font-bold italic">{text}</span>
          ) : (
            text
          )}
        </p>
      );
    }

    const truncatedText = text.substring(0, maxLength) + "...";

    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600 whitespace-pre-wrap break-words sm:w-md w-sm">
          {isExpanded ? (
            isFromToday ? (
              <span className="font-bold italic">{text}</span>
            ) : (
              text
            )
          ) : (
            isFromToday ? (
              <span className="font-bold italic">{truncatedText}</span>
            ) : (
              truncatedText
            )
          )}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDescription(taskId);
          }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show more
            </>
          )}
        </button>
      </div>
    );
  };

  // Helper functions for priority and due date
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

    const timeStr = format(date, "h:mm a");

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${timeStr}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${timeStr}`;
    } else {
      return `${format(date, "MMM d, yyyy")} at ${timeStr}`;
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setSelectedDate(new Date(e.target.value));
    }
  };

  useEffect(() => {
    const fetchStaffAndTasks = async () => {
      try {
        setLoading(true);
        // Fetch staff members
        const usersResponse = await fetch("/api/users?role=staff");
        if (!usersResponse.ok) throw new Error("Failed to fetch users");

        const usersData = await usersResponse.json();

        // Fetch tasks for each staff member for the selected date
        const staffWithTasks = await Promise.all(
          usersData.users.map(async (user: any) => {
            const dateStr =
              selectedDate.getFullYear() +
              "-" +
              String(selectedDate.getMonth() + 1).padStart(2, "0") +
              "-" +
              String(selectedDate.getDate()).padStart(2, "0");
            const tasksResponse = await fetch(
              `/api/tasks?staffId=${user.id}&date=${dateStr}`
            );
            const tasksData = tasksResponse.ok
              ? await tasksResponse.json()
              : { tasks: [] };

            return {
              ...user,
              tasks: tasksData.tasks.map((task: any) => ({
                ...task,
                status: task.status.toLowerCase().replace("_", "-"),
              })),
            };
          })
        );

        setStaffMembers(staffWithTasks);

        // Fetch feedback for all tasks
        await fetchTasksFeedback(staffWithTasks);

        // Auto-select staff member if initial props are provided
        if (initialSelectedStaffId && initialSelectedStaffName) {
          const staffToSelect = staffWithTasks.find(
            (staff) => staff.id === initialSelectedStaffId
          );
          if (staffToSelect) {
            setSelectedStaff(staffToSelect);
          }
        }
      } catch (error) {
        console.error("Failed to fetch staff and tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffAndTasks();
  }, [selectedDate, initialSelectedStaffId, initialSelectedStaffName]);

  const fetchTasksFeedback = async (staffMembers: StaffMember[]) => {
    try {
      const allTasks = staffMembers.flatMap((staff) => staff.tasks);
      const feedbackPromises = allTasks.map(async (task) => {
        const response = await fetch(
          `/api/feedback?taskId=${task.id}&type=daily`
        );
        if (response.ok) {
          const data = await response.json();
          return { taskId: task.id, feedback: data.feedback || [] };
        }
        return { taskId: task.id, feedback: [] };
      });

      const feedbackResults = await Promise.all(feedbackPromises);
      const feedbackMap: { [taskId: string]: any[] } = {};

      feedbackResults.forEach((result) => {
        feedbackMap[result.taskId] = result.feedback;
      });

      setTaskFeedback(feedbackMap);
    } catch (error) {
      console.error("Failed to fetch tasks feedback:", error);
    }
  };

  const handleGiveFeedback = (task: Task) => {
    setFeedbackTask(task);
  };

  const handleViewFeedback = (task: Task) => {
    setViewTaskFeedback(task);
  };

  const handleEditFeedback = (feedback: any) => {
    setEditingFeedback(feedback);
    setEditFeedbackText(feedback.content);
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
          content: editFeedbackText,
        }),
      });

      if (response.ok) {
        // Refresh feedback for the task
        if (editingFeedback.taskId) {
          const feedbackResponse = await fetch(
            `/api/feedback?taskId=${editingFeedback.taskId}&type=daily`
          );
          if (feedbackResponse.ok) {
            const feedbackData = await feedbackResponse.json();
            setTaskFeedback((prev) => ({
              ...prev,
              [editingFeedback.taskId]: feedbackData.feedback || [],
            }));
          }
        }
        setEditingFeedback(null);
        setEditFeedbackText("");
      }
    } catch (error) {
      console.error("Failed to update feedback:", error);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string, taskId: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh feedback for the task
        const feedbackResponse = await fetch(
          `/api/feedback?taskId=${taskId}&type=daily`
        );
        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json();
          setTaskFeedback((prev) => ({
            ...prev,
            [taskId]: feedbackData.feedback || [],
          }));
        }
      }
    } catch (error) {
      console.error("Failed to delete feedback:", error);
    }
  };

  const handleFeedbackSubmit = async (feedbackData: any) => {
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: feedbackData.feedbackText,
          type: "daily",
          staffId: selectedStaff?.id,
          managerId: getCurrentUserId(),
          taskId: feedbackTask?.id,
          media: feedbackData.media || [],
        }),
      });

      if (response.ok) {
        // Refresh feedback for this specific task
        if (feedbackTask?.id) {
          const feedbackResponse = await fetch(
            `/api/feedback?taskId=${feedbackTask.id}&type=daily`
          );
          if (feedbackResponse.ok) {
            const feedbackData = await feedbackResponse.json();
            setTaskFeedback((prev) => ({
              ...prev,
              [feedbackTask.id]: feedbackData.feedback || [],
            }));
          }
        }
        setFeedbackTask(null);
        // Optionally show success message
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  // Task editing and deletion handlers
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowEditTaskDialog(true);
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
          ...taskData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the task in the local state
        setStaffMembers((prev) =>
          prev.map((staff) => ({
            ...staff,
            tasks: staff.tasks.map((task) =>
              task.id === editingTask.id
                ? {
                    ...data.task,
                    status: data.task.status.toLowerCase().replace("_", "-"),
                  }
                : task
            ),
          }))
        );
        // Also update the currently selected staff's tasks so the UI updates immediately
        setSelectedStaff((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((task) =>
                  task.id === editingTask.id
                    ? {
                        ...data.task,
                        status: data.task.status
                          .toLowerCase()
                          .replace("_", "-"),
                      }
                    : task
                ),
              }
            : prev
        );
        setShowEditTaskDialog(false);
        setEditingTask(null);
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = (task: Task) => {
    setDeletingTask(task);
    setShowDeleteTaskAlert(true);
  };

  const confirmDeleteTask = async () => {
    if (!deletingTask) return;

    try {
      const response = await fetch(`/api/tasks?id=${deletingTask.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove the task from the local state
        setStaffMembers((prev) =>
          prev.map((staff) => ({
            ...staff,
            tasks: staff.tasks.filter((task) => task.id !== deletingTask.id),
          }))
        );
        // Also update selectedStaff so the UI updates immediately
        setSelectedStaff((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.filter((task) => task.id !== deletingTask.id),
              }
            : prev
        );
        setShowDeleteTaskAlert(false);
        setDeletingTask(null);
      } else {
        console.error("Failed to delete task - response not ok");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
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
    return "bg-yellow-500";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-white">
            View Daily Tasks
          </h2>
          <p className="text-gray-300">
            Loading staff members and their tasks...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="bg-white/10 backdrop-blur-lg border-white/20"
            >
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-white/20 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-white/20 rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse">
                  <div className="h-4 bg-white/20 rounded w-full mb-2"></div>
                  <div className="h-4 bg-white/20 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (selectedStaff) {
    return (
      <div className="space-y-6  2xl:max-w-6xl xl:max-w-4xl lg:max-w-2xl md:max-w-2xl max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedStaff(null)}
            className="text-white hover:bg-white/20 self-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Staff List
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-[#ff7a30]">
              {selectedStaff.avatarKey ? (
                <SecureImage
                  imageKey={selectedStaff.avatarKey}
                  alt={`${selectedStaff.name}'s avatar`}
                  className="h-full w-full rounded-full object-cover"
                  fallback={
                    <AvatarFallback className="bg-[#465c88] text-white">
                      {selectedStaff.name.charAt(0)}
                    </AvatarFallback>
                  }
                />
              ) : (
                <>
                  <AvatarImage
                    src={selectedStaff.avatar || "/placeholder.svg"}
                  />
                  <AvatarFallback className="bg-[#465c88] text-white">
                    {selectedStaff.name.charAt(0)}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {selectedStaff.name}'s Daily Tasks
              </h2>
              <p className="text-sm sm:text-base text-gray-300">
                {selectedStaff.email}
              </p>
              {selectedStaff.department && (
                <Badge
                  variant="outline"
                  className="mt-1 border-white/30 text-white"
                >
                  {selectedStaff.department}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Tasks for {format(selectedDate, "PPP")}</span>
              <Badge variant="outline">
                {selectedStaff.tasks.length} task
                {selectedStaff.tasks.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
            <CardDescription>
              Review and provide feedback on daily tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Media</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStaff.tasks.map((task) => {
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        {task.title}
                      </TableCell>
                      <TableCell className="max-w-2xl min-w-0">
                        <div className="w-full">
                          {renderExpandableText(task.description, task.id, 50, task.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.priority ? (
                          <Badge
                            className={getPriorityColor(task.priority)}
                            variant="outline"
                          >
                            {getPriorityIcon(task.priority)}
                            {task.priority}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No priority
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <div className="space-y-1">
                            <div
                              className={`flex items-center space-x-1 text-sm ${
                                isTaskOverdue(task.dueDate)
                                  ? "text-red-600 font-medium"
                                  : "text-gray-600"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              <span>{formatDueDate(task.dueDate)}</span>
                            </div>
                            {/* Show urgency indicators - removed for managers */}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No due date
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {task.progress}%
                            </span>
                          </div>
                          <Progress value={task.progress} className="w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusColor(task.status)}
                          variant="secondary"
                        >
                          {task.status.replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs min-w-0">
                        <div className="w-full">
                          {renderExpandableText(
                            task.notes || "",
                            `${task.id}-notes`
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.media.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTaskMedia(task)}
                          >
                            <Images className="h-4 w-4 mr-2" />
                            {task.media.length} image
                            {task.media.length !== 1 ? "s" : ""}
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No media
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(taskFeedback[task.id]?.length || 0) > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFeedback(task)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {taskFeedback[task.id]?.length || 0} feedback
                            {(taskFeedback[task.id]?.length || 0) !== 1
                              ? "s"
                              : ""}
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No feedback
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {currentUser?.role !== "bk" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGiveFeedback(task)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Add Feedback
                            </Button>
                          )}
                          {/* Show edit and delete buttons for self-assigned tasks or tasks assigned by current user */}
                          {(() => {
                            const canEditDelete =
                              (!task.assignedBy ||
                                task.assignedBy?.id === getCurrentUserId()) &&
                              currentUser?.role !== "bk";
                            return (
                              canEditDelete && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      handleEditTask(task);
                                    }}
                                    title="Edit task"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      handleDeleteTask(task);
                                    }}
                                    title="Delete task"
                                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )
                            );
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <FeedbackDialog
          task={feedbackTask}
          staffMember={selectedStaff}
          open={!!feedbackTask}
          onClose={() => setFeedbackTask(null)}
          onSubmit={handleFeedbackSubmit}
        />

        {/* View Feedback Dialog */}
        <Dialog
          open={!!viewTaskFeedback}
          onOpenChange={() => setViewTaskFeedback(null)}
        >
          <DialogContent className="w-[80vw] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Feedback for: {viewTaskFeedback?.title}</DialogTitle>
              <DialogDescription>
                All feedback entries for this task
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {viewTaskFeedback &&
              taskFeedback[viewTaskFeedback.id]?.length > 0 ? (
                taskFeedback[viewTaskFeedback.id].map((feedback: any) => {
                  return (
                    <div key={feedback.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {feedback.manager?.name
                                ?.charAt(0)
                                ?.toUpperCase() || "M"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {feedback.manager?.name || "Manager"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm text-gray-500">
                            {new Date(feedback.createdAt).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(feedback.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                          {feedback.manager?.id === getCurrentUserId() &&
                            currentUser?.role !== "bk" && (
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditFeedback(feedback)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteFeedback(
                                      feedback.id,
                                      feedback.taskId
                                    )
                                  }
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                        </div>
                      </div>
                      {editingFeedback?.id === feedback.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editFeedbackText}
                            onChange={(e) =>
                              setEditFeedbackText(e.target.value)
                            }
                            rows={3}
                            className="text-sm max-w-[350px] md:max-w-[450px]"
                          />
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={handleUpdateFeedback}
                              disabled={!editFeedbackText.trim()}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingFeedback(null);
                                setEditFeedbackText("");
                              }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {feedback.content}
                          </p>
                          {feedback.media && feedback.media.length > 0 && (
                            <div className="pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setSelectedFeedbackMedia(feedback)
                                }
                                className="text-blue-600 "
                              >
                                <Images className="h-4 w-4 mr-2" />
                                View {feedback.media.length} media file
                                {feedback.media.length !== 1 ? "s" : ""}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No feedback available for this task.
                </div>
              )}
            </div>
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setViewTaskFeedback(null)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setViewTaskFeedback(null);
                  setFeedbackTask(viewTaskFeedback);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Add More Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Media Viewing Dialog */}
        <Dialog
          open={!!selectedTaskMedia}
          onOpenChange={() => setSelectedTaskMedia(null)}
        >
          <DialogContent className="w-[80vw]">
            <DialogHeader>
              <DialogTitle>Task Media: {selectedTaskMedia?.title}</DialogTitle>
              <DialogDescription>
                {selectedTaskMedia?.media.length} file
                {selectedTaskMedia?.media.length !== 1 ? "s" : ""} attached to
                this task
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {selectedTaskMedia?.media.map((media, index) => (
                <Card key={index} className="overflow-hidden">
                  <div
                    className="aspect-video bg-gray-100 cursor-pointer"
                    onClick={() => {
                      // Images: Show in current dialog (no action needed)
                      if (media.type.startsWith("image/")) {
                        return;
                      }

                      // PDFs: Open in new tab
                      if (media.type === "application/pdf") {
                        if (media.key) {
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
                        return;
                      }

                      // Other documents: Download
                      if (media.key) {
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
                    }}
                  >
                    {media.type.startsWith("image/") ? (
                      media.key ? (
                        <SecureImage
                          imageKey={media.key}
                          alt={media.filename}
                          className="w-full h-full object-cover"
                          fallback={
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <span className="text-gray-500">
                                Image unavailable
                              </span>
                            </div>
                          }
                        />
                      ) : (
                        <img
                          src={media.url || "/placeholder.svg"}
                          alt={media.filename}
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : media.type === "application/pdf" ? (
                      <div className="w-full h-full bg-red-50 border border-red-200 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-200 opacity-50"></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-12 h-16 bg-white border border-red-300 rounded shadow-sm mb-2 relative">
                            <div className="absolute top-2 left-2 right-2 h-0.5 bg-red-300 rounded"></div>
                            <div className="absolute top-4 left-2 right-2 h-0.5 bg-red-300 rounded"></div>
                            <div className="absolute top-6 left-2 right-2 h-0.5 bg-red-300 rounded"></div>
                            <div className="absolute bottom-1 right-1 text-[8px] font-bold text-red-500">
                              PDF
                            </div>
                          </div>
                          <span className="text-xs text-red-600 font-medium">
                            Click to open
                          </span>
                        </div>
                      </div>
                    ) : media.type.startsWith("video/") ? (
                      media.key ? (
                        <SecureVideo
                          videoKey={media.key}
                          filename={media.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={media.url}
                          className="w-full h-full object-cover"
                          controls
                          preload="metadata"
                        />
                      )
                    ) : (
                      <div className="w-full h-full bg-gray-50 border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-center">
                          <DownloadIcon className="h-8 w-8 text-gray-500 mb-2" />
                          {media.type === "application/msword" ||
                          media.type ===
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? (
                            <span className="text-xs text-blue-600 font-medium">
                              DOC - Click to download
                            </span>
                          ) : media.type === "application/postscript" ||
                            media.filename.toLowerCase().endsWith(".ai") ? (
                            <span className="text-xs text-orange-600 font-medium">
                              AI - Click to download
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600 font-medium">
                              Click to download
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm mb-1">
                      {media.filename}
                    </h4>
                    {media.caption && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        {media.caption}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Feedback Media Viewing Dialog */}
        <Dialog
          open={!!selectedFeedbackMedia}
          onOpenChange={() => setSelectedFeedbackMedia(null)}
        >
          <DialogContent className="w-[80vw]">
            <DialogHeader>
              <DialogTitle>Feedback Media</DialogTitle>
              <DialogDescription>
                Media files attached to feedback from{" "}
                {selectedFeedbackMedia?.manager?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {selectedFeedbackMedia?.media.map((media: any, index: number) => (
                <Card key={index} className="overflow-hidden">
                  <div
                    className="aspect-video bg-gray-100 cursor-pointer"
                    onClick={() => {
                      // Images: Show in current dialog (no action needed)
                      if (media.type.startsWith("image/")) {
                        return;
                      }

                      // PDFs: Open in new tab
                      if (media.type === "application/pdf") {
                        if (media.key) {
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
                        return;
                      }

                      // Other documents: Download
                      if (media.key) {
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
                    }}
                  >
                    {media.type.startsWith("image/") ? (
                      media.key ? (
                        <SecureImage
                          imageKey={media.key}
                          alt={media.filename}
                          className="w-full h-full object-cover"
                          fallback={
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <span className="text-gray-500">
                                Image unavailable
                              </span>
                            </div>
                          }
                        />
                      ) : (
                        <img
                          src={media.url || "/placeholder.svg"}
                          alt={media.filename}
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : media.type === "application/pdf" ? (
                      <div className="w-full h-full bg-red-50 border border-red-200 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-200 opacity-50"></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-12 h-16 bg-white border border-red-300 rounded shadow-sm mb-2 relative">
                            <div className="absolute top-2 left-2 right-2 h-0.5 bg-red-300 rounded"></div>
                            <div className="absolute top-4 left-2 right-2 h-0.5 bg-red-300 rounded"></div>
                            <div className="absolute top-6 left-2 right-2 h-0.5 bg-red-300 rounded"></div>
                            <div className="absolute bottom-1 right-1 text-[8px] font-bold text-red-500">
                              PDF
                            </div>
                          </div>
                          <span className="text-xs text-red-600 font-medium">
                            Click to open
                          </span>
                        </div>
                      </div>
                    ) : media.type.startsWith("video/") ? (
                      media.key ? (
                        <SecureVideo
                          videoKey={media.key}
                          filename={media.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={media.url}
                          className="w-full h-full object-cover"
                          controls
                          preload="metadata"
                        />
                      )
                    ) : (
                      <div className="w-full h-full bg-gray-50 border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-center">
                          <DownloadIcon className="h-8 w-8 text-gray-500 mb-2" />
                          {media.type === "application/msword" ||
                          media.type ===
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? (
                            <span className="text-xs text-blue-600 font-medium">
                              DOC - Click to download
                            </span>
                          ) : media.type === "application/postscript" ||
                            media.filename.toLowerCase().endsWith(".ai") ? (
                            <span className="text-xs text-orange-600 font-medium">
                              AI - Click to download
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600 font-medium">
                              Click to download
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm mb-1">
                      {media.filename}
                    </h4>
                    {media.caption && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        {media.caption}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={showEditTaskDialog} onOpenChange={setShowEditTaskDialog}>
          <DialogContent className="w-[80vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update the self-assigned task details
              </DialogDescription>
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

        {/* Delete Task Confirmation Alert */}
        <AlertDialog
          open={showDeleteTaskAlert}
          onOpenChange={setShowDeleteTaskAlert}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingTask?.title}"? This
                action cannot be undone and will also delete any associated
                media and feedback.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteTaskAlert(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteTask}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Task
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white">
            View Daily Tasks
          </h2>
          <p className="text-sm sm:text-base text-gray-300">
            Select a date and staff member to view their daily tasks and provide
            feedback
          </p>
        </div>
        <div className="flex flex-col space-y-2">
          <Label className="text-sm text-white">Select Date</Label>
          <div className="w-full sm:w-[280px]">
            <DatePickerButton
              date={selectedDate}
              onDateChange={(date) => date && setSelectedDate(date)}
              placeholder="Select date"
              className="w-full sm:w-[280px]"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {staffMembers.map((staff) => {
          const completedTasks = staff.tasks.filter(
            (task) => task.status === "completed"
          ).length;
          const averageProgress =
            staff.tasks.reduce((acc, task) => acc + task.progress, 0) /
              staff.tasks.length || 0;

          // Calculate urgent tasks - removed for managers
          const urgentTasks = 0;

          return (
            <Card
              key={staff.id}
              className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15"
              onClick={() => setSelectedStaff(staff)}
            >
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-[#ff7a30] flex-shrink-0">
                      {staff.avatarKey ? (
                        <SecureImage
                          imageKey={staff.avatarKey}
                          alt={`${staff.name}'s avatar`}
                          className="h-full w-full rounded-full object-cover"
                          fallback={
                            <AvatarFallback className="bg-[#465c88] text-white">
                              {staff.name.charAt(0)}
                            </AvatarFallback>
                          }
                        />
                      ) : (
                        <>
                          <AvatarImage
                            src={staff.avatar || "/placeholder.svg"}
                          />
                          <AvatarFallback className="bg-[#465c88] text-white">
                            {staff.name.charAt(0)}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <h3 className="text-lg sm:text-xl font-semibold text-white truncate">
                          {staff.name}
                        </h3>
                        {staff.department && (
                          <Badge
                            variant="secondary"
                            className="text-sm bg-[#ff7a30] text-white flex-shrink-0"
                          >
                            {staff.department}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm sm:text-base text-gray-300 truncate">
                        {staff.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex flex-row items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base text-gray-300 font-medium">
                          {staff.tasks.length} task
                          {staff.tasks.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="hidden sm:block w-px h-4 bg-gray-400"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base text-gray-300">
                          {completedTasks} completed
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 sm:gap-2">
                      <div className="text-2xl sm:text-3xl font-bold text-[#ff7a30]">
                        {Math.round(averageProgress)}%
                      </div>
                      <div className="text-xs sm:text-sm text-gray-300 font-medium">
                        Average Progress
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
