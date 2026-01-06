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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CalendarIcon,
  MessageSquare,
  Clock,
  ChevronDown,
  Edit,
  Trash2,
  ArrowLeft,
  DownloadIcon,
} from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SecureImage } from "@/components/secure-image";
import { useToast } from "@/hooks/use-toast";

interface WeeklySummary {
  id: string;
  summary: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  staff: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    avatarKey?: string;
  };
  feedback: Feedback[];
  media?: Array<{
    id: string;
    url: string;
    filename: string;
    type: string;
    description?: string;
    key?: string;
    source?: string;
    taskId?: string;
    taskTitle?: string;
  }>;
}

interface Task {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  feedback: Feedback[];
  media?: Array<{
    id: string;
    url: string;
    filename: string;
    type: string;
    caption?: string;
    key?: string;
    createdAt: string;
  }>;
}

interface Feedback {
  id: string;
  managerId: string;
  content: string;
  type: "DAILY" | "WEEKLY";
  createdAt: string;
  updatedAt: string;
  manager: {
    id: string;
    name: string;
    avatar?: string;
    avatarKey?: string;
  };
  media?: Array<{
    id: string;
    url: string;
    filename: string;
    type: string;
    caption?: string;
    key?: string;
    createdAt: string;
  }>;
}

interface ViewFeedbackProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "staff" | "manager" | "bk";
    avatar?: string;
    avatarKey?: string;
  };
}

export function ViewFeedback({ user }: ViewFeedbackProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedWeek, setSelectedWeek] = useState<Date>();
  const [activeTab, setActiveTab] = useState<string>("daily");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedWeeklySummary, setSelectedWeeklySummary] =
    useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch tasks and weekly summaries
  useEffect(() => {
    if (activeTab === "daily") {
      fetchTasks();
    } else {
      fetchWeeklySummaries();
    }
  }, [user.id, activeTab]);

  // Refetch data when filters change
  useEffect(() => {
    if (activeTab === "daily") {
      fetchTasks();
    } else {
      fetchWeeklySummaries();
    }
  }, [selectedDate, selectedWeek, activeTab]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      let url = `/api/tasks?staffId=${user.id}`;

      // Add date filter if selected
      if (selectedDate) {
        url += `&date=${format(selectedDate, "yyyy-MM-dd")}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklySummaries = async () => {
    try {
      setLoading(true);
      let url = `/api/weekly-summaries?staffId=${user.id}`;

      // Add week filter if selected
      if (selectedWeek) {
        const startOfWeek = new Date(selectedWeek);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of week (Sunday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); // End of week (Saturday)

        url += `&startDate=${format(startOfWeek, "yyyy-MM-dd")}`;
        url += `&endDate=${format(endOfWeek, "yyyy-MM-dd")}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setWeeklySummaries(data.weeklySummaries || []);
      }
    } catch (error) {
      console.error("Failed to fetch weekly summaries:", error);
      toast({
        title: "Error",
        description: "Failed to load weekly summaries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditFeedback = (feedback: Feedback) => {
    setEditingFeedback(feedback);
    setEditContent(feedback.content);
    setEditType(feedback.type);
    setEditDialogOpen(true);
  };

  const handleUpdateFeedback = async () => {
    if (!editingFeedback) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/feedback/${editingFeedback.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: editContent,
          type: editType,
        }),
      });

      if (response.ok) {
        // Refresh the data based on current tab
        if (activeTab === "daily") {
          await fetchTasks();
        } else {
          await fetchWeeklySummaries();
        }
        setEditDialogOpen(false);
        setEditingFeedback(null);
        toast({
          title: "Success",
          description: "Feedback updated successfully",
        });
      } else {
        throw new Error("Failed to update feedback");
      }
    } catch (error) {
      console.error("Failed to update feedback:", error);
      toast({
        title: "Error",
        description: "Failed to update feedback",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh the data based on current tab
        if (activeTab === "daily") {
          await fetchTasks();
        } else {
          await fetchWeeklySummaries();
        }
        toast({
          title: "Success",
          description: "Feedback deleted successfully",
        });
      } else {
        throw new Error("Failed to delete feedback");
      }
    } catch (error) {
      console.error("Failed to delete feedback:", error);
      toast({
        title: "Error",
        description: "Failed to delete feedback",
        variant: "destructive",
      });
    }
  };

  // Generate available dates from task data
  const getAvailableDates = () => {
    const dates = tasks
      .map((task) => ({
        date: new Date(task.createdAt),
        label: format(new Date(task.createdAt), "MMM d, yyyy"),
        value: format(new Date(task.createdAt), "yyyy-MM-dd"),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by most recent first

    // Remove duplicates
    const uniqueDates = dates.filter(
      (date, index, self) =>
        index === self.findIndex((d) => d.value === date.value)
    );

    return uniqueDates;
  };

  // Generate available weeks from weekly summary data
  const getAvailableWeeks = () => {
    const weeks = weeklySummaries
      .map((summary) => ({
        start: new Date(summary.startDate),
        end: new Date(summary.endDate),
        label: `${format(new Date(summary.startDate), "MMM d")} - ${format(
          new Date(summary.endDate),
          "MMM d, yyyy"
        )}`,
        value: format(new Date(summary.startDate), "yyyy-MM-dd"),
      }))
      .sort((a, b) => b.start.getTime() - a.start.getTime()); // Sort by most recent first

    // Remove duplicates
    const uniqueWeeks = weeks.filter(
      (week, index, self) =>
        index === self.findIndex((w) => w.value === week.value)
    );

    return uniqueWeeks;
  };

  const availableDates = getAvailableDates();
  const availableWeeks = getAvailableWeeks();

  const getFilteredTasks = () => {
    let filtered = [...tasks];

    // Filter by feedback type (daily or weekly)
    filtered = filtered.filter((task) =>
      task.feedback.some(
        (feedback) => feedback.type.toLowerCase() === activeTab
      )
    );

    if (selectedDate) {
      const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
      filtered = filtered.filter(
        (task) =>
          format(new Date(task.createdAt), "yyyy-MM-dd") === selectedDateStr
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const getFilteredTasksByType = (type: string) => {
    let filtered = [...tasks];

    // Filter by feedback type
    filtered = filtered.filter((task) =>
      task.feedback.some((feedback) => feedback.type.toLowerCase() === type)
    );

    if (selectedDate) {
      const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
      filtered = filtered.filter(
        (task) =>
          format(new Date(task.createdAt), "yyyy-MM-dd") === selectedDateStr
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const getFilteredWeeklySummaries = () => {
    let filtered = [...weeklySummaries];

    // Filter by feedback type - only show summaries that have weekly feedback
    filtered = filtered.filter((summary) =>
      summary.feedback.some((feedback) => feedback.type === "WEEKLY")
    );

    if (selectedWeek) {
      const selectedWeekStr = format(selectedWeek, "yyyy-MM-dd");
      filtered = filtered.filter(
        (summary) =>
          format(new Date(summary.startDate), "yyyy-MM-dd") === selectedWeekStr
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  };

  const filteredTasks = getFilteredTasks();

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "h:mm a");
  };

  const getFeedbackCount = () => {
    return tasks.reduce((count, task) => count + task.feedback.length, 0);
  };

  function renderWeeklySummaryList(summaries: WeeklySummary[]) {
    if (loading) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading weekly summaries...</p>
          </CardContent>
        </Card>
      );
    }

    if (summaries.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No weekly summaries found
            </h3>
            <p className="text-gray-600">
              {selectedWeek
                ? `No weekly summaries were found for the selected week`
                : "No weekly summaries available"}
            </p>
            {selectedWeek && (
              <Button
                variant="outline"
                onClick={() => setSelectedWeek(undefined)}
                className="mt-4"
              >
                View All Weekly Summaries
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {summaries.map((summary) => (
          <Card
            key={summary.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedWeeklySummary(summary)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">
                    Week of {format(new Date(summary.startDate), "MMM d")} -{" "}
                    {format(new Date(summary.endDate), "MMM d, yyyy")}
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-2 mt-1">
                    <CalendarIcon className="h-3 w-3" />
                    <span>
                      Created on{" "}
                      {format(new Date(summary.createdAt), "MMM d, yyyy")}
                    </span>
                  </CardDescription>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {summary.summary}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {summary.feedback.length > 0 && (
                    <Badge variant="secondary">
                      {summary.feedback.length} feedback
                      {summary.feedback.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {summary.media && summary.media.length > 0 && (
                    <Badge variant="secondary">
                      {summary.media.length} media
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  function renderTaskList(tasks: Task[]) {
    if (loading) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
          </CardContent>
        </Card>
      );
    }

    if (tasks.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tasks found
            </h3>
            <p className="text-gray-600">
              {selectedDate
                ? `No tasks were created on ${format(
                    selectedDate,
                    "MMMM d, yyyy"
                  )}`
                : "No tasks available"}
            </p>
            {selectedDate && (
              <Button
                variant="outline"
                onClick={() => setSelectedDate(undefined)}
                className="mt-4"
              >
                View All Tasks
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedTask(task)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  <CardDescription className="flex items-center space-x-2 mt-1">
                    <CalendarIcon className="h-3 w-3" />
                    <span>
                      Created on{" "}
                      {format(new Date(task.createdAt), "MMM d, yyyy")}
                    </span>
                  </CardDescription>
                </div>
                {task.feedback.length > 0 && (
                  <Badge variant="secondary">
                    {task.feedback.length} feedback
                    {task.feedback.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  function renderTaskFeedback(task: Task) {
    // Filter feedback by current tab type
    const filteredFeedback = task.feedback.filter(
      (feedback) => feedback.type.toLowerCase() === activeTab
    );

    const sortedFeedback = [...filteredFeedback].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 text-white">
          <Button
            variant="ghost"
            onClick={() => setSelectedTask(null)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Tasks</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{task.title}</CardTitle>
            <CardDescription>
              Created on {format(new Date(task.createdAt), "MMMM d, yyyy")} at{" "}
              {formatTime(task.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              {(() => {
                const taskDate = new Date(task.createdAt);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isFromToday = taskDate >= today;
                return isFromToday ? (
                  <span className="font-bold italic">{task.description}</span>
                ) : (
                  task.description
                );
              })()}
            </p>

            {/* Task Media */}
            {task.media && task.media.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Task Attachments ({task.media.length})
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {task.media.map((media) => (
                    <div key={media.id} className="bg-white rounded border p-2">
                      {media.type.startsWith("image/") ? (
                        media.key ? (
                          <SecureImage
                            imageKey={media.key}
                            alt={media.filename}
                            className={
                              media.type.startsWith("video/")
                                ? "w-full aspect-video object-cover rounded"
                                : "w-full h-20 object-cover rounded"
                            }
                            fallback={
                              <div
                                className={
                                  media.type.startsWith("video/")
                                    ? "w-full aspect-video bg-gray-200 rounded flex items-center justify-center"
                                    : "w-full h-20 bg-gray-200 rounded flex items-center justify-center"
                                }
                              >
                                <span className="text-xs text-gray-500">
                                  {media.type.startsWith("video/")
                                    ? "Video"
                                    : "Image"}
                                </span>
                              </div>
                            }
                          />
                        ) : (
                          <img
                            src={media.url}
                            alt={media.filename}
                            className={
                              media.type.startsWith("video/")
                                ? "w-full aspect-video object-cover rounded"
                                : "w-full h-20 object-cover rounded"
                            }
                          />
                        )
                      ) : (
                        <div
                          className={
                            media.type.startsWith("video/")
                              ? "w-full aspect-video bg-gray-100 rounded flex items-center justify-center"
                              : "w-full h-20 bg-gray-100 rounded flex items-center justify-center"
                          }
                        >
                          <span className="text-xs text-gray-600">
                            {media.type.startsWith("video/")
                              ? "VIDEO"
                              : media.type.split("/")[1]?.toUpperCase() ||
                                "FILE"}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {media.filename}
                      </p>
                      {media.caption && (
                        <p className="text-xs text-gray-500 mt-1">
                          {media.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center text-white">
              <MessageSquare className="h-5 w-5 mr-2" />
              {activeTab === "daily" ? "Daily" : "Weekly"} Feedback for this
              task
            </h3>
            <Badge variant="secondary">
              {sortedFeedback.length} feedback
              {sortedFeedback.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {sortedFeedback.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No {activeTab} feedback yet
                </h3>
                <p className="text-gray-600">
                  No {activeTab} feedback has been provided for this task.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedFeedback.map((feedback) => (
                <Card
                  key={feedback.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          {feedback.manager.avatarKey ? (
                            <SecureImage
                              imageKey={feedback.manager.avatarKey}
                              alt={`${feedback.manager.name}'s avatar`}
                              className="h-full w-full rounded-full object-cover"
                              fallback={
                                <AvatarFallback>
                                  {feedback.manager.name.charAt(0)}
                                </AvatarFallback>
                              }
                            />
                          ) : (
                            <>
                              <AvatarImage
                                src={
                                  feedback.manager.avatar || "/placeholder.svg"
                                }
                              />
                              <AvatarFallback>
                                {feedback.manager.name.charAt(0)}
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">
                            {feedback.manager.name}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(
                                new Date(feedback.createdAt),
                                "MMM d, yyyy"
                              )}{" "}
                              at {formatTime(feedback.createdAt)}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      {user.role === "manager" &&
                        user.id === feedback.managerId && (
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFeedback(feedback)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFeedback(feedback.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm leading-relaxed">
                        {feedback.content}
                      </p>

                      {feedback.media && feedback.media.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Feedback Attachments ({feedback.media.length})
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {feedback.media.map((media) => (
                              <div
                                key={media.id}
                                className="bg-white rounded border p-2 cursor-pointer"
                              >
                                {media.type.startsWith("image/") ? (
                                  media.key ? (
                                    <SecureImage
                                      imageKey={media.key}
                                      alt={media.filename}
                                      className={
                                        media.type.startsWith("video/")
                                          ? "w-full aspect-video object-cover rounded"
                                          : "w-full h-20 object-cover rounded"
                                      }
                                      fallback={
                                        <div
                                          className={
                                            media.type.startsWith("video/")
                                              ? "w-full aspect-video bg-gray-200 rounded flex items-center justify-center"
                                              : "w-full h-20 bg-gray-200 rounded flex items-center justify-center"
                                          }
                                        >
                                          <span className="text-xs text-gray-500">
                                            {media.type.startsWith("video/")
                                              ? "Video"
                                              : "Image"}
                                          </span>
                                        </div>
                                      }
                                    />
                                  ) : (
                                    <img
                                      src={media.url}
                                      alt={media.filename}
                                      className={
                                        media.type.startsWith("video/")
                                          ? "w-full aspect-video object-cover rounded"
                                          : "w-full h-20 object-cover rounded"
                                      }
                                    />
                                  )
                                ) : (
                                  <div
                                    className={
                                      media.type.startsWith("video/")
                                        ? "w-full aspect-video bg-gray-100 rounded flex items-center justify-center"
                                        : "w-full h-20 bg-gray-100 rounded flex items-center justify-center"
                                    }
                                  >
                                    <span className="text-xs text-gray-600">
                                      {media.type.startsWith("video/")
                                        ? "VIDEO"
                                        : media.type
                                            .split("/")[1]
                                            ?.toUpperCase() || "FILE"}
                                    </span>
                                  </div>
                                )}
                                <p className="text-xs text-gray-600 mt-1 truncate">
                                  {media.filename}
                                </p>
                                {media.caption && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {media.caption}
                                  </p>
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
          )}
        </div>
      </div>
    );
  }

  function renderWeeklySummaryFeedback(summary: WeeklySummary) {
    // Filter feedback by weekly type
    const weeklyFeedback = summary.feedback.filter(
      (feedback) => feedback.type === "WEEKLY"
    );

    const sortedFeedback = [...weeklyFeedback].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 text-white">
          <Button
            variant="ghost"
            onClick={() => setSelectedWeeklySummary(null)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Weekly Summaries</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Week of {format(new Date(summary.startDate), "MMM d")} -{" "}
              {format(new Date(summary.endDate), "MMM d, yyyy")}
            </CardTitle>
            <CardDescription>
              Created on {format(new Date(summary.createdAt), "MMMM d, yyyy")}{" "}
              at {formatTime(summary.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Weekly Summary
                </h5>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {summary.summary}
                </p>
              </div>

              {/* Weekly Summary Media */}
              {summary.media && summary.media.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Media from This Week ({summary.media.length})
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {summary.media.map((media) => (
                      <div
                        key={media.id}
                        className="bg-white rounded border p-2 cursor-pointer"
                        onClick={() => {
                          // Images: Show preview (existing behavior)
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
                              className={
                                media.type.startsWith("video/")
                                  ? "w-full aspect-video object-cover rounded"
                                  : "w-full h-20 object-cover rounded"
                              }
                              fallback={
                                <div
                                  className={
                                    media.type.startsWith("video/")
                                      ? "w-full aspect-video bg-gray-200 rounded flex items-center justify-center"
                                      : "w-full h-20 bg-gray-200 rounded flex items-center justify-center"
                                  }
                                >
                                  <span className="text-xs text-gray-500">
                                    {media.type.startsWith("video/")
                                      ? "Video"
                                      : "Image"}
                                  </span>
                                </div>
                              }
                            />
                          ) : (
                            <img
                              src={media.url}
                              alt={media.filename}
                              className={
                                media.type.startsWith("video/")
                                  ? "w-full aspect-video object-cover rounded"
                                  : "w-full h-20 object-cover rounded"
                              }
                            />
                          )
                        ) : media.type === "application/pdf" ? (
                          <div className="w-full h-20 bg-red-50 border border-red-200 rounded flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-200 opacity-50 rounded"></div>
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="w-6 h-8 bg-white border border-red-300 rounded shadow-sm mb-1 relative">
                                <div className="absolute top-1 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
                                <div className="absolute top-2 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
                                <div className="absolute top-3 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
                                <div className="absolute bottom-0.5 right-0.5 text-[6px] font-bold text-red-500">
                                  PDF
                                </div>
                              </div>
                              <span className="text-[10px] text-red-600 font-medium">
                                Click to open
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-20 bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="relative z-10 flex flex-col items-center">
                              <DownloadIcon className="h-4 w-4 text-gray-500 mb-1" />
                              {media.type === "application/msword" ||
                              media.type ===
                                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? (
                                <span className="text-[10px] text-blue-600 font-medium">
                                  DOC
                                </span>
                              ) : media.type === "application/postscript" ||
                                media.filename.toLowerCase().endsWith(".ai") ? (
                                <span className="text-[10px] text-orange-600 font-medium">
                                  AI
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-600 font-medium">
                                  {media.type.split("/")[1]?.toUpperCase() ||
                                    "FILE"}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {media.filename}
                        </p>
                        {media.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {media.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Weekly Feedback for this summary
            </h3>
            <Badge variant="secondary">
              {sortedFeedback.length} feedback
              {sortedFeedback.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {sortedFeedback.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No weekly feedback yet
                </h3>
                <p className="text-gray-600">
                  No weekly feedback has been provided for this summary.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedFeedback.map((feedback) => (
                <Card
                  key={feedback.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          {feedback.manager.avatarKey ? (
                            <SecureImage
                              imageKey={feedback.manager.avatarKey}
                              alt={`${feedback.manager.name}'s avatar`}
                              className="h-full w-full rounded-full object-cover"
                              fallback={
                                <AvatarFallback>
                                  {feedback.manager.name.charAt(0)}
                                </AvatarFallback>
                              }
                            />
                          ) : (
                            <>
                              <AvatarImage
                                src={
                                  feedback.manager.avatar || "/placeholder.svg"
                                }
                              />
                              <AvatarFallback>
                                {feedback.manager.name.charAt(0)}
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">
                            {feedback.manager.name}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(
                                new Date(feedback.createdAt),
                                "MMM d, yyyy"
                              )}{" "}
                              at {formatTime(feedback.createdAt)}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      {user.role === "manager" &&
                        user.id === feedback.managerId && (
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFeedback(feedback)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFeedback(feedback.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm leading-relaxed">
                        {feedback.content}
                      </p>

                      {feedback.media && feedback.media.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Feedback Attachments ({feedback.media.length})
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {feedback.media.map((media) => (
                              <div
                                key={media.id}
                                className="bg-white rounded border p-2 cursor-pointer"
                              >
                                {media.type.startsWith("image/") ? (
                                  media.key ? (
                                    <SecureImage
                                      imageKey={media.key}
                                      alt={media.filename}
                                      className={
                                        media.type.startsWith("video/")
                                          ? "w-full aspect-video object-cover rounded"
                                          : "w-full h-20 object-cover rounded"
                                      }
                                      fallback={
                                        <div
                                          className={
                                            media.type.startsWith("video/")
                                              ? "w-full aspect-video bg-gray-200 rounded flex items-center justify-center"
                                              : "w-full h-20 bg-gray-200 rounded flex items-center justify-center"
                                          }
                                        >
                                          <span className="text-xs text-gray-500">
                                            {media.type.startsWith("video/")
                                              ? "Video"
                                              : "Image"}
                                          </span>
                                        </div>
                                      }
                                    />
                                  ) : (
                                    <img
                                      src={media.url}
                                      alt={media.filename}
                                      className={
                                        media.type.startsWith("video/")
                                          ? "w-full aspect-video object-cover rounded"
                                          : "w-full h-20 object-cover rounded"
                                      }
                                    />
                                  )
                                ) : (
                                  <div
                                    className={
                                      media.type.startsWith("video/")
                                        ? "w-full aspect-video bg-gray-100 rounded flex items-center justify-center"
                                        : "w-full h-20 bg-gray-100 rounded flex items-center justify-center"
                                    }
                                  >
                                    <span className="text-xs text-gray-600">
                                      {media.type.startsWith("video/")
                                        ? "VIDEO"
                                        : media.type
                                            .split("/")[1]
                                            ?.toUpperCase() || "FILE"}
                                    </span>
                                  </div>
                                )}
                                <p className="text-xs text-gray-600 mt-1 truncate">
                                  {media.filename}
                                </p>
                                {media.caption && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {media.caption}
                                  </p>
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
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-white">
          {user.role === "staff" ? "View Feedback" : "Feedback Given"}
        </h2>
        <p className="text-gray-300">
          {user.role === "staff"
            ? "Review feedback from your manager on your tasks"
            : "Review feedback you've given to staff members"}
        </p>
      </div>

      {selectedTask ? (
        renderTaskFeedback(selectedTask)
      ) : selectedWeeklySummary ? (
        renderWeeklySummaryFeedback(selectedWeeklySummary)
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Daily Feedback</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-6">
            {/* Date Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Filter by Task Creation Date
                </CardTitle>
                <CardDescription>
                  Choose a date to view tasks created on that date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={
                    selectedDate ? format(selectedDate, "yyyy-MM-dd") : "all"
                  }
                  onValueChange={(value) =>
                    setSelectedDate(
                      value && value !== "all" ? new Date(value) : undefined
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All dates</SelectItem>
                    {availableDates.map((date) => (
                      <SelectItem key={date.value} value={date.value}>
                        {date.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(undefined)}
                    className="mt-2 w-full"
                  >
                    Clear Date Filter
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Daily Tasks List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center text-white">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Tasks with Daily Feedback
                  {selectedDate && (
                    <span className="ml-2 text-sm font-normal text-gray-300">
                      created on {format(selectedDate, "MMMM d, yyyy")}
                    </span>
                  )}
                </h3>
                <Badge variant="secondary">
                  {getFilteredTasksByType("daily").length} task
                  {getFilteredTasksByType("daily").length !== 1 ? "s" : ""}
                </Badge>
              </div>
              {renderTaskList(getFilteredTasksByType("daily"))}
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6">
            {/* Week Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Filter by Week
                </CardTitle>
                <CardDescription>
                  Choose a week to view weekly summaries from that period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={
                    selectedWeek ? format(selectedWeek, "yyyy-MM-dd") : "all"
                  }
                  onValueChange={(value) =>
                    setSelectedWeek(
                      value && value !== "all" ? new Date(value) : undefined
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All weeks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All weeks</SelectItem>
                    {availableWeeks.map((week) => (
                      <SelectItem key={week.value} value={week.value}>
                        {week.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedWeek && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedWeek(undefined)}
                    className="mt-2 w-full"
                  >
                    Clear Week Filter
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Weekly Summaries List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center text-white">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Weekly Summaries with Feedback
                  {selectedWeek && (
                    <span className="ml-2 text-sm font-normal text-gray-300">
                      for week of {format(selectedWeek, "MMMM d, yyyy")}
                    </span>
                  )}
                </h3>
                <Badge variant="secondary">
                  {getFilteredWeeklySummaries().length} summar
                  {getFilteredWeeklySummaries().length !== 1 ? "ies" : "y"}
                </Badge>
              </div>
              {renderWeeklySummaryList(getFilteredWeeklySummaries())}
            </div>
          </TabsContent>

          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feedback Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {getFilteredTasksByType("daily").length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Tasks with Daily Feedback{selectedDate ? " (Filtered)" : ""}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {getFilteredWeeklySummaries().length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Weekly Summaries with Feedback
                    {selectedWeek ? " (Filtered)" : ""}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Tabs>
      )}

      {/* Edit Feedback Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Feedback</DialogTitle>
            <DialogDescription>
              Update the feedback content and type
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="feedback-type">Feedback Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select feedback type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily Task</SelectItem>
                  <SelectItem value="WEEKLY">Weekly Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-content">Feedback</Label>
              <Textarea
                id="feedback-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Provide detailed feedback..."
                rows={6}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFeedback}
              disabled={isSubmitting || !editContent.trim()}
            >
              {isSubmitting ? "Updating..." : "Update Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
