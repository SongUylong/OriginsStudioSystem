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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Images,
  Calendar,
  FileText,
  MessageSquare,
  CalendarDays,
  Edit2,
  Trash2,
  Save,
  X,
  DownloadIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { WeeklyFeedbackDialog } from "@/components/weekly-feedback-dialog";
import { SecureImage } from "@/components/secure-image";
import { useAuth } from "@/hooks/use-auth";

interface WeeklyMedia {
  id: string;
  url: string;
  filename: string;
  type: string;
  description: string;
  uploadedAt: string;
  key?: string;
  source?: "weekly" | "task";
  taskId?: string;
  taskTitle?: string;
}

interface WeeklySummary {
  id: string;
  title: string;
  summary: string;
  weekStartDate: string;
  weekEndDate: string;
  media: WeeklyMedia[];
  createdAt: string;
}

interface StaffWeekly {
  id: string;
  name: string;
  email: string;
  department?: string;
  avatar?: string;
  avatarKey?: string;
  weeklySummaries: WeeklySummary[];
}

export function ViewWeeklyTasks() {
  const [selectedStaff, setSelectedStaff] = useState<StaffWeekly | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<WeeklySummary | null>(
    null
  );
  const [feedbackSummary, setFeedbackSummary] = useState<WeeklySummary | null>(
    null
  );
  const [summaryFeedback, setSummaryFeedback] = useState<{
    [summaryId: string]: any[];
  }>({});
  const [viewSummaryFeedback, setViewSummaryFeedback] =
    useState<WeeklySummary | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<any | null>(null);
  const [editFeedbackText, setEditFeedbackText] = useState<string>("");
  const [staffWeeklyData, setStaffWeeklyData] = useState<StaffWeekly[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWeek, setSelectedWeek] = useState<string>(
    `${format(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    )}_${format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")}`
  );
  const { getCurrentUserId, user: currentUser } = useAuth();

  // Generate week options (current week and 8 weeks in the past - no future weeks)
  const generateWeekOptions = () => {
    const options = [];
    const currentDate = new Date();

    for (let i = 0; i >= -8; i--) {
      const weekDate = addWeeks(currentDate, i);
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
      const value = `${format(weekStart, "yyyy-MM-dd")}_${format(
        weekEnd,
        "yyyy-MM-dd"
      )}`;
      const label = `Week of ${format(weekStart, "MMM d")} - ${format(
        weekEnd,
        "MMM d, yyyy"
      )}`;

      options.push({ value, label, startDate: weekStart, endDate: weekEnd });
    }

    return options;
  };
  const weekOptions = generateWeekOptions();

  const handleWeekChange = (weekValue: string) => {
    setSelectedWeek(weekValue);
    const [startDateStr, endDateStr] = weekValue.split("_");
    setSelectedDate(new Date(startDateStr));
  };
  useEffect(() => {
    const fetchStaffAndWeeklySummaries = async () => {
      try {
        setLoading(true);
        // Fetch staff members
        const usersResponse = await fetch("/api/users?role=staff");
        if (!usersResponse.ok) throw new Error("Failed to fetch users");

        const usersData = await usersResponse.json();

        // Calculate week start and end dates for the selected date
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday as start
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

        // Fetch weekly summaries for each staff member for the selected week
        const staffWithSummaries = await Promise.all(
          usersData.users.map(async (user: any) => {
            const summariesResponse = await fetch(
              `/api/weekly-summaries?staffId=${user.id}&startDate=${
                weekStart.toISOString().split("T")[0]
              }&endDate=${weekEnd.toISOString().split("T")[0]}`
            );
            const summariesData = summariesResponse.ok
              ? await summariesResponse.json()
              : { weeklySummaries: [] };

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              department: user.department,
              avatar: user.avatar,
              avatarKey: user.avatarKey,
              weeklySummaries: summariesData.weeklySummaries.map(
                (summary: any) => ({
                  id: summary.id,
                  title: `Week of ${new Date(
                    summary.startDate
                  ).toLocaleDateString()}`,
                  summary: summary.summary,
                  weekStartDate: summary.startDate,
                  weekEndDate: summary.endDate,
                  media: summary.media || [],
                  createdAt: summary.createdAt,
                })
              ),
            };
          })
        );

        setStaffWeeklyData(staffWithSummaries);

        // Fetch feedback for all weekly summaries
        await fetchSummariesFeedback(staffWithSummaries);
      } catch (error) {
        console.error("Failed to fetch staff and weekly summaries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffAndWeeklySummaries();
  }, [selectedDate]);

  const fetchSummariesFeedback = async (staffMembers: StaffWeekly[]) => {
    try {
      const allSummaries = staffMembers.flatMap(
        (staff) => staff.weeklySummaries
      );
      const feedbackPromises = allSummaries.map(async (summary) => {
        const response = await fetch(
          `/api/feedback?weeklySummaryId=${summary.id}&type=weekly`
        );
        if (response.ok) {
          const data = await response.json();
          return { summaryId: summary.id, feedback: data.feedback || [] };
        }
        return { summaryId: summary.id, feedback: [] };
      });

      const feedbackResults = await Promise.all(feedbackPromises);
      const feedbackMap: { [summaryId: string]: any[] } = {};

      feedbackResults.forEach((result) => {
        feedbackMap[result.summaryId] = result.feedback;
      });

      setSummaryFeedback(feedbackMap);
    } catch (error) {
      console.error("Failed to fetch summaries feedback:", error);
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

  const handleGiveFeedback = (summary: WeeklySummary) => {
    setFeedbackSummary(summary);
  };

  const handleViewFeedback = (summary: WeeklySummary) => {
    setViewSummaryFeedback(summary);
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
        // Refresh feedback for the weekly summary
        if (editingFeedback.weeklySummaryId) {
          const feedbackResponse = await fetch(
            `/api/feedback?weeklySummaryId=${editingFeedback.weeklySummaryId}&type=weekly`
          );
          if (feedbackResponse.ok) {
            const feedbackData = await feedbackResponse.json();
            setSummaryFeedback((prev) => ({
              ...prev,
              [editingFeedback.weeklySummaryId]: feedbackData.feedback || [],
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

  const handleDeleteFeedback = async (
    feedbackId: string,
    weeklySummaryId: string
  ) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh feedback for the weekly summary
        const feedbackResponse = await fetch(
          `/api/feedback?weeklySummaryId=${weeklySummaryId}&type=weekly`
        );
        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json();
          setSummaryFeedback((prev) => ({
            ...prev,
            [weeklySummaryId]: feedbackData.feedback || [],
          }));
        }
      }
    } catch (error) {
      console.error("Failed to delete feedback:", error);
    }
  };

  const handleWeeklyFeedbackSubmit = async (feedbackData: any) => {
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: feedbackData.feedbackText,
          type: "weekly",
          staffId: selectedStaff?.id,
          managerId: getCurrentUserId(),
          weeklySummaryId: feedbackData.summaryId,
          media: feedbackData.media || [],
        }),
      });

      if (response.ok) {
        // Refresh feedback for this specific summary
        if (feedbackData.summaryId) {
          const feedbackResponse = await fetch(
            `/api/feedback?weeklySummaryId=${feedbackData.summaryId}&type=weekly`
          );
          if (feedbackResponse.ok) {
            const refreshedFeedbackData = await feedbackResponse.json();
            setSummaryFeedback((prev) => ({
              ...prev,
              [feedbackData.summaryId]: refreshedFeedbackData.feedback || [],
            }));
          }
        }
        setFeedbackSummary(null);
        // Optionally show success message
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-white">
            View Weekly Tasks
          </h2>
          <p className="text-gray-300">
            Loading staff members and their weekly summaries...
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

  if (selectedSummary) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedSummary(null)}
            className="text-white hover:bg-white/20 self-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Summary
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {selectedSummary.title}
            </h2>
            <p className="text-sm sm:text-base text-gray-300">
              {formatDateRange(
                selectedSummary.weekStartDate,
                selectedSummary.weekEndDate
              )}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Images className="h-5 w-5 mr-2" />
              Weekly Media Gallery
            </CardTitle>
            <CardDescription>
              {selectedSummary.media.length} file
              {selectedSummary.media.length !== 1 ? "s" : ""} from this week
              (includes weekly media and latest task images)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedSummary.media.map((media) => (
                <Card key={media.id} className="overflow-hidden">
                  <div
                    className="aspect-video bg-gray-100 cursor-pointer"
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
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm mb-2">
                      {media.filename}
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed mb-2">
                      {media.description}
                    </p>
                    {media.source === "task" && media.taskTitle && (
                      <Badge variant="secondary" className="text-xs mb-2">
                        From task: {media.taskTitle}
                      </Badge>
                    )}

                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">
                        Uploaded:{" "}
                        {new Date(media.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedStaff) {
    return (
      <div className="space-y-6">
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
                {selectedStaff.name}'s Weekly Summaries
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

        <div className="grid gap-6">
          {selectedStaff.weeklySummaries.map((summary) => (
            <Card key={summary.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{summary.title}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDateRange(
                        summary.weekStartDate,
                        summary.weekEndDate
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {summary.media.length} photo
                    {summary.media.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Weekly Summary
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {summary.summary}
                  </p>
                </div>

                {/* Feedback Section */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm mb-1 flex items-center text-blue-800">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Manager Feedback
                      </h4>
                      <p className="text-xs text-blue-600">
                        {(summaryFeedback[summary.id]?.length || 0) > 0
                          ? `${summaryFeedback[summary.id]?.length} feedback${
                              summaryFeedback[summary.id]?.length !== 1
                                ? "s"
                                : ""
                            } received`
                          : "No feedback yet"}
                      </p>
                    </div>
                    {(summaryFeedback[summary.id]?.length || 0) > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFeedback(summary)}
                      >
                        View Feedback
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Submitted:{" "}
                    {new Date(summary.createdAt).toLocaleDateString()} at{" "}
                    {new Date(summary.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button onClick={() => setSelectedSummary(summary)}>
                      <Images className="h-4 w-4 mr-2" />
                      View All Photos
                    </Button>
                    {currentUser?.role !== "bk" && (
                      <Button
                        variant="outline"
                        onClick={() => handleGiveFeedback(summary)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Feedback
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <WeeklyFeedbackDialog
          summary={feedbackSummary}
          staffMember={selectedStaff}
          open={!!feedbackSummary}
          onClose={() => setFeedbackSummary(null)}
          onSubmit={handleWeeklyFeedbackSubmit}
        />

        {/* View Weekly Feedback Dialog */}
        <Dialog
          open={!!viewSummaryFeedback}
          onOpenChange={() => setViewSummaryFeedback(null)}
        >
          <DialogContent className="w-[80vw] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Feedback for Weekly Summary</DialogTitle>
              <DialogDescription>
                All feedback entries for {viewSummaryFeedback?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {viewSummaryFeedback &&
              summaryFeedback[viewSummaryFeedback.id]?.length > 0 ? (
                summaryFeedback[viewSummaryFeedback.id].map((feedback: any) => (
                  <div key={feedback.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {feedback.manager?.name?.charAt(0)?.toUpperCase() ||
                              "M"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {feedback.manager?.name || "Manager"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-500">
                          {new Date(feedback.createdAt).toLocaleDateString()} at{" "}
                          {new Date(feedback.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                                    feedback.weeklySummaryId
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
                          onChange={(e) => setEditFeedbackText(e.target.value)}
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
                      <div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {feedback.content}
                        </p>

                        {feedback.media && feedback.media.length > 0 && (
                          <div className="mt-3">
                            <h6 className="text-xs font-medium text-gray-600 mb-2">
                              Attachments ({feedback.media.length})
                            </h6>
                            <div className="grid grid-cols-3 gap-2">
                              {feedback.media.map((media: any) => (
                                <div
                                  key={media.id}
                                  className="bg-gray-50 rounded border p-2 cursor-pointer"
                                  onClick={() => {
                                    // Images: Show in modal (existing behavior)
                                    if (media.type.startsWith("image/")) {
                                      // This would need modal implementation
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
                                          .then((data) =>
                                            window.open(data.url, "_blank")
                                          )
                                          .catch((err) =>
                                            console.error(
                                              "Error opening PDF:",
                                              err
                                            )
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
                                          const link =
                                            document.createElement("a");
                                          link.href = data.url;
                                          link.download = media.filename;
                                          link.click();
                                        })
                                        .catch((err) =>
                                          console.error(
                                            "Error downloading file:",
                                            err
                                          )
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
                                        className="w-full h-12 object-cover rounded"
                                        fallback={
                                          <div className="w-full h-12 bg-gray-200 rounded flex items-center justify-center">
                                            <span className="text-xs text-gray-500">
                                              Image
                                            </span>
                                          </div>
                                        }
                                      />
                                    ) : (
                                      <img
                                        src={media.url}
                                        alt={media.filename}
                                        className="w-full h-12 object-cover rounded"
                                      />
                                    )
                                  ) : (
                                    <div className="w-full h-12 bg-gray-100 rounded flex items-center justify-center">
                                      {media.type === "application/pdf" ? (
                                        <span className="text-xs text-red-600 font-medium">
                                          PDF
                                        </span>
                                      ) : media.type === "application/msword" ||
                                        media.type ===
                                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? (
                                        <span className="text-xs text-blue-600 font-medium">
                                          DOC
                                        </span>
                                      ) : media.type ===
                                          "application/postscript" ||
                                        media.filename
                                          .toLowerCase()
                                          .endsWith(".ai") ? (
                                        <span className="text-xs text-orange-600 font-medium">
                                          AI
                                        </span>
                                      ) : (
                                        <span className="text-xs text-gray-600">
                                          {media.type
                                            .split("/")[1]
                                            ?.toUpperCase() || "FILE"}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-600 mt-1 truncate">
                                    {media.filename}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No feedback available for this weekly summary.
                </div>
              )}
            </div>
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setViewSummaryFeedback(null)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setViewSummaryFeedback(null);
                  setFeedbackSummary(viewSummaryFeedback);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Add More Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white">
            View Weekly Tasks
          </h2>
          <p className="text-gray-300 text-sm sm:text-base">
            Select a week and staff member to view their weekly summaries and
            media
          </p>
        </div>
        <Select value={selectedWeek} onValueChange={handleWeekChange}>
          <SelectTrigger className="w-full sm:w-[280px] bg-white/20 border-white/30 text-white">
            <CalendarDays className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Select a week" />
          </SelectTrigger>
          <SelectContent>
            {weekOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {staffWeeklyData.map((staff) => {
          const totalSummaries = staff.weeklySummaries.length;
          const totalMedia = staff.weeklySummaries.reduce(
            (acc, summary) => acc + summary.media.length,
            0
          );

          return (
            <Card
              key={staff.id}
              className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15"
              onClick={() => setSelectedStaff(staff)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-[#ff7a30]">
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
                      <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                        {staff.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-300 truncate">
                        {staff.email}
                      </p>
                      {staff.department && (
                        <Badge
                          variant="secondary"
                          className="text-xs mt-1 bg-[#ff7a30] text-white"
                        >
                          {staff.department}
                        </Badge>
                      )}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                        <span className="text-xs sm:text-sm text-gray-300">
                          {totalSummaries} weekly summar
                          {totalSummaries !== 1 ? "ies" : "y"}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-300 hidden sm:inline">
                          •
                        </span>
                        <span className="text-xs sm:text-sm text-gray-300">
                          {totalMedia} photo{totalMedia !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-xl sm:text-2xl font-bold text-[#ff7a30]">
                      {totalMedia}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-300">
                      Total Photos
                    </div>
                    <Badge
                      variant="outline"
                      className="mt-2 border-white/30 text-white text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Weekly
                    </Badge>
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
