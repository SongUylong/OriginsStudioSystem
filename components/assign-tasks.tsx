"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarDays,
  Plus,
  UserPlus,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { FormattedText } from "@/components/ui/formatted-text";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SecureImage } from "@/components/secure-image";
import { DatePickerButton } from "@/components/ui/date-picker-button";
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

interface StaffMember {
  id: string;
  name: string;
  email: string;
  department?: string;
  avatar?: string;
  avatarKey?: string;
}

interface AssignedTask {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: string;
  staff: {
    id: string;
    name: string;
    email: string;
  };
  assignedBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface CollapsibleDescriptionProps {
  description: string;
  createdAt: string;
}

function CollapsibleDescription({
  description,
  createdAt,
}: CollapsibleDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 30;
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

interface AssignTasksProps {
  onViewStaffProgress?: (staffId: string, staffName: string) => void;
}

export function AssignTasks({ onViewStaffProgress }: AssignTasksProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit and delete states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<AssignedTask | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deletingTask, setDeletingTask] = useState<AssignedTask | null>(null);

  // Sorting and filtering states
  const [sortDate, setSortDate] = useState<Date | undefined>(undefined);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("");

  // Form state for both assign and edit
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<
    "LOW" | "NORMAL" | "HIGH" | "URGENT"
  >("NORMAL");

  // Validation state
  const [errors, setErrors] = useState<{
    selectedStaff?: string;
    title?: string;
    description?: string;
    general?: string;
  }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchStaffMembers();
    fetchAssignedTasks();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      const response = await fetch("/api/users?role=staff");
      if (response.ok) {
        const data = await response.json();
        setStaffMembers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch staff members:", error);
    }
  };

  const fetchAssignedTasks = async () => {
    try {
      const response = await fetch("/api/tasks/assigned");
      if (response.ok) {
        const data = await response.json();
        setAssignedTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch assigned tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate staff selection
    if (!selectedStaff) {
      newErrors.selectedStaff = "Please select a staff member";
    }

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

    if (fieldName === "selectedStaff") {
      if (!selectedStaff) {
        newErrors.selectedStaff = "Please select a staff member";
      } else {
        delete newErrors.selectedStaff;
      }
    }

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

  const handleAssignTask = async () => {
    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      setTouched({ selectedStaff: true, title: true, description: true });
      return;
    }

    if (!user?.id) {
      setErrors({ general: "User not authenticated" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tasks/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer temp", // Simplified for now
        },
        body: JSON.stringify({
          staffId: selectedStaff,
          title,
          description,
          dueDate: dueDate?.toISOString(),
          priority,
          managerId: user.id,
        }),
      });

      if (response.ok) {
        const newTask = await response.json();
        setAssignedTasks((prev) => [newTask, ...prev]);

        // Reset form
        resetForm();
        setShowAssignDialog(false);

        toast({
          title: "Success",
          description: "Task assigned successfully!",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign task");
      }
    } catch (error) {
      console.error("Failed to assign task:", error);
      setErrors({
        general:
          error instanceof Error ? error.message : "Failed to assign task",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = (task: AssignedTask) => {
    setEditingTask(task);
    setSelectedStaff(task.staff.id);
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
    setPriority(task.priority);
    setShowEditDialog(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) {
      setErrors({ general: "No task selected for editing" });
      return;
    }

    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      setTouched({ selectedStaff: true, title: true, description: true });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingTask.id,
          title,
          description,
          dueDate: dueDate?.toISOString(),
          priority,
        }),
      });

      if (response.ok) {
        const updatedTaskResponse = await response.json();

        // Update the task in the local state with the response from server
        setAssignedTasks((prev) =>
          prev.map((task) =>
            task.id === editingTask.id
              ? {
                  ...task,
                  ...updatedTaskResponse.task,
                  // Ensure proper format for UI
                  dueDate: updatedTaskResponse.task.dueDate,
                  priority: updatedTaskResponse.task.priority,
                }
              : task
          )
        );

        // Reset form and close dialog
        resetForm();
        setShowEditDialog(false);
        setEditingTask(null);

        toast({
          title: "Success",
          description: "Task updated successfully!",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update task");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = (task: AssignedTask) => {
    setDeletingTask(task);
    setShowDeleteAlert(true);
  };

  const handleViewProgress = (task: AssignedTask) => {
    if (onViewStaffProgress) {
      onViewStaffProgress(task.staff.id, task.staff.name);
    }
  };

  const confirmDeleteTask = async () => {
    if (!deletingTask) return;

    try {
      const response = await fetch(`/api/tasks?id=${deletingTask.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove the task from the local state
        setAssignedTasks((prev) =>
          prev.filter((task) => task.id !== deletingTask.id)
        );

        setShowDeleteAlert(false);
        setDeletingTask(null);

        toast({
          title: "Success",
          description: "Task deleted successfully!",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedStaff("");
    setTitle("");
    setDescription("");
    setDueDate(undefined);
    setPriority("NORMAL");
    setErrors({});
    setTouched({});
  };

  const getPriorityColor = (priority: string) => {
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

  const getPriorityIcon = (priority: string) => {
    if (priority === "URGENT") {
      return <AlertTriangle className="h-3 w-3 mr-1" />;
    }
    return null;
  };

  // Sort tasks by priority (URGENT first) and then by creation date
  const sortedTasks = assignedTasks
    .filter((task) => {
      // Filter by selected date if provided
      if (sortDate) {
        const taskDate = new Date(task.createdAt);
        const selectedDateStr = format(sortDate, "yyyy-MM-dd");
        const taskDateStr = format(taskDate, "yyyy-MM-dd");
        if (taskDateStr !== selectedDateStr) return false;
      }

      // Filter by selected staff member if provided
      if (selectedStaffFilter && selectedStaffFilter !== "all") {
        if (task.staff.id !== selectedStaffFilter) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // First priority: URGENT tasks always come first regardless of other sorting
      const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Secondary sorting: always sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-white">Assign Tasks</h2>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-white">Assign Tasks</h2>
          <p className="text-gray-300">
            Assign tasks to staff members with due dates and priority levels
          </p>
        </div>
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#ff7a30] hover:bg-[#ff7a30]/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Assign New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto sm:w-[80vw] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign New Task</DialogTitle>
              <DialogDescription>
                Assign a task to a staff member with specific requirements and
                deadline
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* General error alert */}
              {errors.general && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="staff">Staff Member *</Label>
                <Select
                  value={selectedStaff}
                  onValueChange={(value) => {
                    setSelectedStaff(value);
                    handleFieldBlur("selectedStaff");
                  }}
                >
                  <SelectTrigger
                    className={
                      touched.selectedStaff && errors.selectedStaff
                        ? "border-red-500"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Select a staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem
                        key={staff.id}
                        value={staff.id}
                        className="text-gray-800 hover:text-white cursor-pointer"
                      >
                        <div className="flex items-center space-x-2 ">
                          <Avatar className="h-6 w-6">
                            {staff.avatarKey ? (
                              <SecureImage
                                imageKey={staff.avatarKey}
                                alt={`${staff.name}'s avatar`}
                                className="h-full w-full rounded-full object-cover"
                                fallback={
                                  <AvatarFallback className="text-xs">
                                    {staff.name.charAt(0)}
                                  </AvatarFallback>
                                }
                              />
                            ) : (
                              <AvatarFallback className="text-xs">
                                {staff.name.charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium">{staff.name}</div>
                            {staff.department && (
                              <div className="text-xs">{staff.department}</div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.selectedStaff && errors.selectedStaff && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errors.selectedStaff}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleFieldBlur("title")}
                  placeholder="Enter task title"
                  className={
                    touched.title && errors.title
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }
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
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => handleFieldBlur("description")}
                  className={`max-w-[350px] md:max-w-[450px] ${
                    touched.description && errors.description
                      ? "border-red-500"
                      : ""
                  }`}
                  placeholder="Describe the task requirements and objectives"
                  rows={3}
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

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(
                    value: "LOW" | "NORMAL" | "HIGH" | "URGENT"
                  ) => setPriority(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">
                      <div className="flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
                        Urgent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date & Time (Optional)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <DatePickerButton
                      date={dueDate}
                      onDateChange={(date) => {
                        if (date) {
                          if (dueDate) {
                            // Preserve existing time
                            date.setHours(
                              dueDate.getHours(),
                              dueDate.getMinutes()
                            );
                          } else {
                            // Set default time to 5 PM (17:00) for end of business day
                            date.setHours(17, 0);
                          }
                          setDueDate(date);
                        } else {
                          setDueDate(undefined);
                        }
                      }}
                      placeholder="Select date"
                      fromDate={new Date()}
                      className="w-full"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="time"
                      value={dueDate ? format(dueDate, "HH:mm") : "17:00"}
                      onChange={(e) => {
                        if (e.target.value && dueDate) {
                          const [hours, minutes] = e.target.value.split(":");
                          const newDate = new Date(dueDate);
                          newDate.setHours(parseInt(hours), parseInt(minutes));
                          setDueDate(newDate);
                        } else if (e.target.value && !dueDate) {
                          // If time is set but no date, set to today
                          const [hours, minutes] = e.target.value.split(":");
                          const newDate = new Date();
                          newDate.setHours(parseInt(hours), parseInt(minutes));
                          setDueDate(newDate);
                        }
                      }}
                      className="w-full"
                      disabled={!dueDate}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAssignDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignTask}
                disabled={
                  isSubmitting ||
                  !selectedStaff.trim() ||
                  !title.trim() ||
                  !description.trim()
                }
              >
                {isSubmitting ? "Assigning..." : "Assign Task"}
              </Button>

              {/* Validation summary */}
              {Object.keys(errors).length > 0 && (
                <div className="text-sm text-red-600">
                  Please fix the errors above before submitting.
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sorting Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter & Sort Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Filter by Assignment Date</Label>
                <DatePickerButton
                  date={sortDate}
                  onDateChange={(date) => setSortDate(date || undefined)}
                  placeholder="Select date"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Filter by Staff Member</Label>
                <Select
                  value={selectedStaffFilter}
                  onValueChange={setSelectedStaffFilter}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All staff members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All staff members</SelectItem>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-5 w-5">
                            {staff.avatarKey ? (
                              <SecureImage
                                imageKey={staff.avatarKey}
                                alt={`${staff.name}'s avatar`}
                                className="h-full w-full rounded-full object-cover"
                                fallback={
                                  <AvatarFallback className="text-xs">
                                    {staff.name.charAt(0)}
                                  </AvatarFallback>
                                }
                              />
                            ) : (
                              <AvatarFallback className="text-xs">
                                {staff.name.charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span>{staff.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(sortDate ||
              (selectedStaffFilter && selectedStaffFilter !== "all")) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSortDate(undefined);
                    setSelectedStaffFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recently Assigned Tasks */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          {(() => {
            const selectedStaff = staffMembers.find(
              (s) => s.id === selectedStaffFilter
            );
            let title = "";

            if (sortDate && selectedStaff) {
              title = `Tasks for ${selectedStaff.name} on ${format(
                sortDate,
                "MMM d, yyyy"
              )}`;
            } else if (sortDate) {
              title = `Tasks Assigned on ${format(sortDate, "MMM d, yyyy")}`;
            } else if (selectedStaff && selectedStaffFilter !== "all") {
              title = `Tasks for ${selectedStaff.name}`;
            } else {
              title = "Recently Assigned Tasks";
            }

            return title;
          })()}
        </h3>
        {sortedTasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tasks assigned yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start by assigning your first task to a staff member.
              </p>
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
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        <Badge
                          className={getPriorityColor(task.priority)}
                          variant="outline"
                        >
                          {getPriorityIcon(task.priority)}
                          {task.priority}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1 w-full max-w-full">
                        <div className="w-full">
                          <CollapsibleDescription
                            description={task.description}
                            createdAt={task.createdAt}
                          />
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewProgress(task)}
                        title="See Progress"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {user?.role !== "bk" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                            title="Edit Task"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task)}
                            title="Delete Task"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          {(() => {
                            const staffMember = staffMembers.find(
                              (s) => s.id === task.staff.id
                            );
                            return staffMember?.avatarKey ? (
                              <SecureImage
                                imageKey={staffMember.avatarKey}
                                alt={`${task.staff.name}'s avatar`}
                                className="h-full w-full rounded-full object-cover"
                                fallback={
                                  <AvatarFallback className="text-xs">
                                    {task.staff.name.charAt(0)}
                                  </AvatarFallback>
                                }
                              />
                            ) : (
                              <AvatarFallback className="text-xs">
                                {task.staff.name.charAt(0)}
                              </AvatarFallback>
                            );
                          })()}
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">
                            {task.staff.name}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {/* Assignment Time */}
                      <div className="text-xs text-gray-500">
                        Assigned:{" "}
                        {format(
                          new Date(task.createdAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </div>

                      {/* Due Date */}
                      {task.dueDate ? (
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className="text-xs font-medium"
                          >
                            Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            at {format(new Date(task.dueDate), "h:mm a")}
                          </div>
                          {/* Show urgency indicator for due dates */}
                          {(() => {
                            const now = new Date();
                            const dueDateTime = new Date(task.dueDate);
                            const timeDiff =
                              dueDateTime.getTime() - now.getTime();
                            const hoursDiff = timeDiff / (1000 * 60 * 60);

                            if (timeDiff < 0) {
                              const overdueDays = Math.floor(
                                Math.abs(timeDiff) / (1000 * 60 * 60 * 24)
                              );
                              return (
                                <Badge
                                  variant="destructive"
                                  className="text-xs font-medium"
                                >
                                  {overdueDays > 0
                                    ? `${overdueDays}d overdue`
                                    : "Overdue!"}
                                </Badge>
                              );
                            } else if (hoursDiff <= 2) {
                              return (
                                <Badge
                                  variant="destructive"
                                  className="text-xs font-medium"
                                >
                                  Due in {Math.ceil(hoursDiff)}h
                                </Badge>
                              );
                            } else if (hoursDiff <= 24) {
                              return (
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-medium bg-orange-100 text-orange-800 border-orange-200"
                                >
                                  Due in {Math.ceil(hoursDiff)}h
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs text-gray-500"
                        >
                          No due date
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto sm:w-[80vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details and requirements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* General error alert */}
            {errors.general && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-staff">Staff Member *</Label>
              <Select
                value={selectedStaff}
                onValueChange={(value) => {
                  setSelectedStaff(value);
                  handleFieldBlur("selectedStaff");
                }}
              >
                <SelectTrigger
                  className={
                    touched.selectedStaff && errors.selectedStaff
                      ? "border-red-500"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          {staff.avatarKey ? (
                            <SecureImage
                              imageKey={staff.avatarKey}
                              alt={`${staff.name}'s avatar`}
                              className="h-full w-full rounded-full object-cover"
                              fallback={
                                <AvatarFallback className="text-xs">
                                  {staff.name.charAt(0)}
                                </AvatarFallback>
                              }
                            />
                          ) : (
                            <AvatarFallback className="text-xs">
                              {staff.name.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="font-medium">{staff.name}</div>
                          {staff.department && (
                            <div className="text-xs text-gray-500">
                              {staff.department}
                            </div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.selectedStaff && errors.selectedStaff && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.selectedStaff}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Task Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleFieldBlur("title")}
                placeholder="Enter task title"
                className={
                  touched.title && errors.title
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
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
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleFieldBlur("description")}
                className={`max-w-[350px] md:max-w-[450px] ${
                  touched.description && errors.description
                    ? "border-red-500"
                    : ""
                }`}
                placeholder="Describe the task requirements and objectives"
                rows={3}
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

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(value: "LOW" | "NORMAL" | "HIGH" | "URGENT") =>
                  setPriority(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">
                    <div className="flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date & Time (Optional)</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <DatePickerButton
                    date={dueDate}
                    onDateChange={(date) => {
                      if (date) {
                        if (dueDate) {
                          // Preserve existing time
                          date.setHours(
                            dueDate.getHours(),
                            dueDate.getMinutes()
                          );
                        } else {
                          // Set default time to 5 PM (17:00) for end of business day
                          date.setHours(17, 0);
                        }
                        setDueDate(date);
                      } else {
                        setDueDate(undefined);
                      }
                    }}
                    placeholder="Select date"
                    fromDate={new Date()}
                    className="w-full"
                  />
                </div>
                <div className="w-24">
                  <Input
                    type="time"
                    value={dueDate ? format(dueDate, "HH:mm") : "17:00"}
                    onChange={(e) => {
                      if (e.target.value && dueDate) {
                        const [hours, minutes] = e.target.value.split(":");
                        const newDate = new Date(dueDate);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setDueDate(newDate);
                      } else if (e.target.value && !dueDate) {
                        // If time is set but no date, set to today
                        const [hours, minutes] = e.target.value.split(":");
                        const newDate = new Date();
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setDueDate(newDate);
                      }
                    }}
                    className="w-full"
                    disabled={!dueDate}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingTask(null);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTask}
              disabled={
                isSubmitting ||
                !selectedStaff.trim() ||
                !title.trim() ||
                !description.trim()
              }
            >
              {isSubmitting ? "Updating..." : "Update Task"}
            </Button>

            {/* Validation summary */}
            {Object.keys(errors).length > 0 && (
              <div className="text-sm text-red-600">
                Please fix the errors above before submitting.
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTask?.title}"? This
              action cannot be undone and will also delete any associated media
              and feedback.
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
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
