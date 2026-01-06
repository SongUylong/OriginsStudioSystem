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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerButton } from "@/components/ui/date-picker-button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  CalendarDays,
  Clock,
  CheckCircle2,
  PlayCircle,
  Images,
  FileText,
  Video,
  Download,
} from "lucide-react";
import { SecureImage } from "@/components/secure-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormattedText } from "@/components/ui/formatted-text";

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
    id: string;
    url: string;
    filename: string;
    type: string;
    caption?: string;
    key?: string;
  }>;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  avatarKey?: string;
  tasks: Task[];
}

interface TeamDailyProps {
  user?: any; // Optional user prop for compatibility
}

export function TeamDaily({ user }: TeamDailyProps = {}) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [allTeamData, setAllTeamData] = useState<TeamMember[]>([]);
  const [staffList, setStaffList] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    filename: string;
    type: string;
    key?: string;
  } | null>(null);
  const [showMediaDialog, setShowMediaDialog] = useState(false);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!date) return;

      setLoading(true);
      setError(null);

      try {
        // Get all staff members
        const usersResponse = await fetch("/api/users?role=staff");
        if (!usersResponse.ok) {
          throw new Error("Failed to fetch team members");
        }
        const usersData = await usersResponse.json();
        const users = usersData.users || [];

        // Get tasks for each team member for the selected date
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        const teamMembersWithTasks = await Promise.all(
          users.map(async (user: any) => {
            try {
              const tasksResponse = await fetch(
                `/api/tasks?staffId=${user.id}&date=${dateStr}`
              );
              if (!tasksResponse.ok) {
                throw new Error(`Failed to fetch tasks for user ${user.id}`);
              }
              const tasksData = await tasksResponse.json();

              // Ensure tasks is always an array
              const tasks = Array.isArray(tasksData)
                ? tasksData
                : tasksData.tasks || [];

              return {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                avatarKey: user.avatarKey,
                tasks: tasks,
              };
            } catch (error) {
              console.error(`Error fetching tasks for user ${user.id}:`, error);
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                avatarKey: user.avatarKey,
                tasks: [], // Ensure tasks is always an array
              };
            }
          })
        );

        setAllTeamData(teamMembersWithTasks);
        // Extract staff list for filter
        const staffListData = users.map((user: any) => ({
          id: user.id,
          name: user.name,
        }));
        setStaffList(staffListData);
      } catch (error) {
        console.error("Error fetching team data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load team data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [date]);

  // Apply staff filter
  useEffect(() => {
    if (selectedStaff === "all") {
      setTeamData(allTeamData);
    } else {
      setTeamData(allTeamData.filter((member) => member.id === selectedStaff));
    }
  }, [allTeamData, selectedStaff]);

  const calculateTeamStats = () => {
    const allTasks = teamData.flatMap((member) =>
      Array.isArray(member.tasks) ? member.tasks : []
    );
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(
      (task) => task.status === "completed"
    ).length;
    const inProgressTasks = allTasks.filter(
      (task) => task.status === "in-progress"
    ).length;

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate average progress across all tasks
    const totalProgress = allTasks.reduce(
      (sum, task) => sum + task.progress,
      0
    );
    const averageProgress =
      totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      completionRate,
      averageProgress,
      teamSize: teamData.length,
    };
  };

  const stats = calculateTeamStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white";
      case "in-progress":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    return "bg-gray-300";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-red-400";
      case "HIGH":
        return "text-orange-400";
      case "NORMAL":
        return "text-blue-400";
      case "LOW":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3" />;
      case "in-progress":
        return <PlayCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getMediaIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <Images className="h-4 w-4" />;
    } else if (type.startsWith("video/")) {
      return <Video className="h-4 w-4" />;
    } else {
      return <FileText className="h-4 w-4" />;
    }
  };

  const handleMediaClick = (media: {
    url: string;
    filename: string;
    type: string;
    key?: string;
  }) => {
    // Images: Show in modal
    if (media.type.startsWith("image/")) {
      setSelectedMedia(media);
      setShowMediaDialog(true);
      return;
    }

    // PDFs: Open in new tab
    if (media.type === "application/pdf") {
      if (media.key) {
        // For secure PDFs, get signed URL first
        fetch(`/api/private-image?key=${encodeURIComponent(media.key)}`)
          .then((res) => res.json())
          .then((data) => window.open(data.url, "_blank"))
          .catch((err) => console.error("Error opening PDF:", err));
      } else {
        window.open(media.url, "_blank");
      }
      return;
    }

    // Other documents (.doc, .ai, etc.): Download
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-white">
            Team Daily Overview
          </h2>
          <p className="text-gray-300">
            View team's overall task progress and performance
          </p>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading team data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-white">
            Team Daily Overview
          </h2>
          <p className="text-gray-300">
            View team's overall task progress and performance
          </p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2 text-white">
          Team Daily Overview
        </h2>
        <p className="text-gray-300">
          View team's overall task progress and performance
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-4">
        {/* Staff Filter */}
        <div className="flex items-center space-x-2">
          <DatePickerButton
            date={date}
            onDateChange={(date) => setDate(date)}
            placeholder="Select Date"
            className="sm:w-[180px] w-[180px] bg-white/10 border-white/20 text-white hover:bg-white/15"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger className="w-[120px] sm:w-[180px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all" className="text-white hover:bg-gray-800">
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center text-white">
            <Users className="h-5 w-5 mr-2" />
            Team Tasks for{" "}
            {date
              ? date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Selected Date"}
          </h3>
          <Badge variant="outline" className="border-white/30 text-white">
            {teamData.length} team member{teamData.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="space-y-6">
          {teamData.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-8 text-center">
                <p className="text-white/70">
                  No team members found for the selected filters
                </p>
              </CardContent>
            </Card>
          ) : (
            teamData.map((member) => (
              <Card
                key={member.id}
                className="bg-white/10 backdrop-blur-lg border-white/20"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        {member.avatarKey ? (
                          <SecureImage
                            imageKey={member.avatarKey}
                            alt={member.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <AvatarImage
                            src={member.avatar || "/placeholder-user.jpg"}
                          />
                        )}
                        <AvatarFallback className="bg-[#ff7a30] text-white">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg text-white">
                          {member.name}
                        </CardTitle>
                        <CardDescription className="text-gray-300 flex items-center space-x-4 mt-1">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {Array.isArray(member.tasks)
                                ? member.tasks.length
                                : 0}{" "}
                              tasks
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3 text-green-400" />
                            <span>
                              {Array.isArray(member.tasks)
                                ? member.tasks.filter(
                                    (t) => t.status === "completed"
                                  ).length
                                : 0}{" "}
                              completed
                            </span>
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        {Array.isArray(member.tasks) && member.tasks.length > 0
                          ? Math.round(
                              member.tasks.reduce(
                                (acc, task) => acc + task.progress,
                                0
                              ) / member.tasks.length
                            )
                          : 0}
                        %
                      </div>
                      <div className="text-xs text-gray-400">avg progress</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!Array.isArray(member.tasks) || member.tasks.length === 0 ? (
                    <div className="text-center text-white/70 py-4">
                      No tasks assigned for this date
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {member.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-white text-sm">
                              {task.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              {task.priority && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getPriorityColor(
                                    task.priority
                                  )} border-current`}
                                >
                                  {task.priority}
                                </Badge>
                              )}
                              <Badge
                                className={`${getStatusColor(
                                  task.status
                                )} text-white`}
                                variant="secondary"
                              >
                                {getStatusIcon(task.status)}
                                <span className="ml-1">
                                  {task.status.replace("-", " ")}
                                </span>
                              </Badge>
                            </div>
                          </div>

                                                     {task.description && (
                             <div className="text-xs text-gray-300 mb-3">
                               <FormattedText
                                 content={task.description}
                                 className="text-xs text-gray-300"
                               />
                             </div>
                           )}

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">
                                Progress
                              </span>
                              <span className="text-xs font-medium text-white">
                                {task.progress}%
                              </span>
                            </div>
                            <Progress
                              value={task.progress}
                              className="h-2 bg-white/20"
                            />

                            {/* Media Section */}
                            {task.media && task.media.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-400 font-medium flex items-center">
                                    <Images className="h-3 w-3 mr-1" />
                                    Media ({task.media.length})
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {task.media
                                    .slice(0, 4)
                                    .map((media, index) => (
                                      <div
                                        key={media.id}
                                        className="relative group cursor-pointer"
                                        onClick={() => handleMediaClick(media)}
                                      >
                                        {media.type.startsWith("image/") ? (
                                          <div className="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
                                            {media.key ? (
                                              <SecureImage
                                                imageKey={media.key}
                                                alt={media.filename}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                              />
                                            ) : (
                                              <img
                                                src={media.url}
                                                alt={media.filename}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                              />
                                            )}
                                            {index === 3 &&
                                              task.media.length > 4 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                  <span className="text-white text-xs font-medium">
                                                    +{task.media.length - 4}{" "}
                                                    more
                                                  </span>
                                                </div>
                                              )}
                                          </div>
                                        ) : media.type === "application/pdf" ? (
                                          <div className="aspect-square rounded-lg overflow-hidden bg-red-50/20 border border-red-200/30 flex items-center justify-center group-hover:bg-red-50/30 transition-colors relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-red-100/20 to-red-200/20"></div>
                                            <div className="relative z-10 text-center">
                                              <div className="w-8 h-10 bg-white/90 border border-red-300/50 rounded shadow-sm mb-2 mx-auto relative">
                                                <div className="absolute top-1.5 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
                                                <div className="absolute top-3 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
                                                <div className="absolute top-4.5 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
                                                <div className="absolute bottom-0.5 right-0.5 text-[6px] font-bold text-red-500">
                                                  PDF
                                                </div>
                                              </div>
                                              <p className="text-[10px] text-red-300 font-medium truncate px-1">
                                                Click to open
                                              </p>
                                            </div>
                                            {index === 3 &&
                                              task.media.length > 4 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                  <span className="text-white text-xs font-medium">
                                                    +{task.media.length - 4}{" "}
                                                    more
                                                  </span>
                                                </div>
                                              )}
                                          </div>
                                        ) : media.type ===
                                            "application/msword" ||
                                          media.type ===
                                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? (
                                          <div className="aspect-square rounded-lg overflow-hidden bg-blue-50/20 border border-blue-200/30 flex items-center justify-center group-hover:bg-blue-50/30 transition-colors relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-blue-200/20"></div>
                                            <div className="relative z-10 text-center">
                                              <div className="w-8 h-10 bg-white/90 border border-blue-300/50 rounded shadow-sm mb-2 mx-auto relative">
                                                <div className="absolute inset-1 bg-gradient-to-br from-blue-200/30 to-blue-300/30 rounded-sm"></div>
                                                <div className="absolute bottom-0.5 right-0.5 text-[6px] font-bold text-blue-500">
                                                  DOC
                                                </div>
                                              </div>
                                              <p className="text-[10px] text-blue-300 font-medium truncate px-1">
                                                Click to download
                                              </p>
                                            </div>
                                            {index === 3 &&
                                              task.media.length > 4 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                  <span className="text-white text-xs font-medium">
                                                    +{task.media.length - 4}{" "}
                                                    more
                                                  </span>
                                                </div>
                                              )}
                                          </div>
                                        ) : media.type ===
                                            "application/postscript" ||
                                          media.filename
                                            .toLowerCase()
                                            .endsWith(".ai") ? (
                                          <div className="aspect-square rounded-lg overflow-hidden bg-orange-50/20 border border-orange-200/30 flex items-center justify-center group-hover:bg-orange-50/30 transition-colors relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-orange-100/20 to-orange-200/20"></div>
                                            <div className="relative z-10 text-center">
                                              <div className="w-8 h-10 bg-white/90 border border-orange-300/50 rounded shadow-sm mb-2 mx-auto relative">
                                                <div className="absolute inset-1 bg-gradient-to-br from-orange-200/30 to-orange-300/30 rounded-sm"></div>
                                                <div className="absolute bottom-0.5 right-0.5 text-[6px] font-bold text-orange-500">
                                                  AI
                                                </div>
                                              </div>
                                              <p className="text-[10px] text-orange-300 font-medium truncate px-1">
                                                Click to download
                                              </p>
                                            </div>
                                            {index === 3 &&
                                              task.media.length > 4 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                  <span className="text-white text-xs font-medium">
                                                    +{task.media.length - 4}{" "}
                                                    more
                                                  </span>
                                                </div>
                                              )}
                                          </div>
                                        ) : (
                                          <div className="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors relative">
                                            <div className="text-center">
                                              {getMediaIcon(media.type)}
                                              <p className="text-xs text-gray-300 mt-1 truncate px-1">
                                                {media.filename}
                                              </p>
                                            </div>
                                            {index === 3 &&
                                              task.media.length > 4 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                  <span className="text-white text-xs font-medium">
                                                    +{task.media.length - 4}{" "}
                                                    more
                                                  </span>
                                                </div>
                                              )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                                                         {task.notes && (
                               <div className="mt-3 pt-3 border-t border-white/10">
                                 <span className="text-xs text-gray-400 font-medium">
                                   Notes:
                                 </span>
                                 <div className="text-xs text-gray-300 mt-1">
                                   <FormattedText
                                     content={task.notes}
                                     className="text-xs text-gray-300"
                                   />
                                 </div>
                               </div>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Media Dialog */}
      <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedMedia?.filename}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Media file preview
            </DialogDescription>
          </DialogHeader>

          {selectedMedia && (
            <div className="space-y-4">
              {selectedMedia.type.startsWith("image/") ? (
                <div className="flex justify-center">
                  {selectedMedia.key ? (
                    <SecureImage
                      imageKey={selectedMedia.key}
                      alt={selectedMedia.filename}
                      className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    />
                  ) : (
                    <img
                      src={selectedMedia.url}
                      alt={selectedMedia.filename}
                      className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    />
                  )}
                </div>
              ) : selectedMedia.type.startsWith("video/") ? (
                <div className="flex justify-center">
                  <video
                    controls
                    className="max-w-full max-h-[60vh] rounded-lg"
                    src={selectedMedia.url}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center mb-4">
                    {getMediaIcon(selectedMedia.type)}
                  </div>
                  <p className="text-white mb-2">{selectedMedia.filename}</p>
                  <p className="text-gray-400 text-sm mb-4">
                    File type: {selectedMedia.type}
                  </p>
                  <Button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = selectedMedia.url;
                      link.download = selectedMedia.filename;
                      link.click();
                    }}
                    className="bg-[#ff7a30] hover:bg-[#ff7a30]/90 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
