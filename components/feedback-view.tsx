"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Filter, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Feedback {
  id: string;
  content: string;
  type: "DAILY" | "WEEKLY";
  createdAt: string;
  manager: {
    id: string;
    name: string;
    avatar?: string;
  };
  task?: {
    id: string;
    title: string;
    description: string;
  };
  weeklySummary?: {
    id: string;
    summary: string;
    startDate: string;
    endDate: string;
  };
}
interface FeedbackViewProps {
  userRole: "staff" | "manager" | "bk";
}

export function FeedbackView({ userRole }: FeedbackViewProps) {
  const [newFeedback, setNewFeedback] = useState("");
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed feedbackType state
  const [dateFilter, setDateFilter] = useState<string>("");
  const { getCurrentUserId } = useAuth();

  useEffect(() => {
    fetchFeedback();
  }, [dateFilter]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (userRole === "staff") {
        params.append("staffId", getCurrentUserId() || "");
      }
      // Only fetch daily and weekly feedback
      const response = await fetch(`/api/feedback?${params.toString()}`);
      const data = await response.json();
      let filteredFeedback = (data.feedback || []).filter(
        (fb: Feedback) => fb.type === "DAILY" || fb.type === "WEEKLY"
      );
      // Apply date filter if provided
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filteredFeedback = filteredFeedback.filter((fb: Feedback) => {
          const feedbackDate = new Date(fb.createdAt);
          return feedbackDate.toDateString() === filterDate.toDateString();
        });
      }
      setFeedback(filteredFeedback);
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
    } finally {
      setLoading(false);
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

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setNewFeedback("");
  };

  return (
    <div className="space-y-6">
      {userRole === "manager" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="h-5 w-5 mr-2" />
              Give Feedback
            </CardTitle>
            <CardDescription>Provide feedback to staff members</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <Textarea
                value={newFeedback}
                onChange={(e) => setNewFeedback(e.target.value)}
                placeholder="Write your feedback here..."
                rows={4}
                required
                className="max-w-[350px] md:max-w-[450px]"
              />
              <Button type="submit">Send Feedback</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            {userRole === "staff" ? "Received Feedback" : "Feedback History"}
          </CardTitle>
          <CardDescription>
            {userRole === "staff"
              ? "View feedback from your manager"
              : "View all feedback given to staff"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="date-filter">Filter by Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setDateFilter("");
                }}
                variant="outline"
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Feedback List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center text-gray-500">
                Loading feedback...
              </div>
            ) : feedback.length === 0 ? (
              <div className="text-center text-gray-500">
                No feedback found.
              </div>
            ) : (
              feedback.map((fb) => (
                <div key={fb.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {fb.manager.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{fb.manager.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={fb.type === "DAILY" ? "secondary" : "default"}
                      >
                        {fb.type === "DAILY" ? "Daily Task" : "Weekly Summary"}
                      </Badge>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(fb.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Task or Weekly Summary Info */}
                  {fb.task && (
                    <div className="bg-blue-50 rounded p-2 mb-2">
                      <p className="text-xs font-medium text-blue-800">
                        Task: {fb.task.title}
                      </p>
                      <p className="text-xs text-blue-600">
                        {fb.task.description}
                      </p>
                    </div>
                  )}

                  {fb.weeklySummary && (
                    <div className="bg-green-50 rounded p-2 mb-2">
                      <p className="text-xs font-medium text-green-800">
                        Weekly Summary (
                        {formatDateRange(
                          fb.weeklySummary.startDate,
                          fb.weeklySummary.endDate
                        )}
                        )
                      </p>
                      <p className="text-xs text-green-600">
                        {fb.weeklySummary.summary.substring(0, 100)}...
                      </p>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 mb-2">{fb.content}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
