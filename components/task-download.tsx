"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePickerButton } from "@/components/ui/date-picker-button";
import {
  Download,
  FileText,
  Users,
  Calendar as CalendarIcon2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TaskDownloadProps {
  onBack: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: string;
  notes?: string;
  createdAt: string;
  dueDate?: string;
  priority: string;
  staff: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
  assignedBy?: {
    id: string;
    name: string;
    email: string;
  };
  feedback: Array<{
    id: string;
    content: string;
    type: string;
    createdAt: string;
    manager: {
      name: string;
    };
  }>;
}

export function TaskDownload({ onBack }: TaskDownloadProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (startDate > endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsLoading(true);
    setDownloadProgress(0);

    try {
      // Fetch tasks for the date range
      const response = await fetch(
        `/api/tasks?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const { tasks }: { tasks: Task[] } = await response.json();
      setDownloadProgress(50);

      // Generate PDF content
      const pdf = await generatePDF(tasks);
      setDownloadProgress(75);

      // Create and download the file
      const pdfBlob = pdf.output("blob");
      const link = document.createElement("a");
      const url = URL.createObjectURL(pdfBlob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `staff-tasks-${format(startDate, "yyyy-MM-dd")}-to-${format(
          endDate,
          "yyyy-MM-dd"
        )}.pdf`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadProgress(100);
      toast.success(`Successfully generated PDF with ${tasks.length} tasks`);

      // Reset progress after a delay
      setTimeout(() => setDownloadProgress(0), 2000);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("An error occurred while generating the PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async (tasks: Task[]) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const title = `Tasks Report (${format(startDate!, "MM/dd/yyyy")} - ${format(endDate!, "MM/dd/yyyy")})`;
    
    doc.setFontSize(14);
    doc.text(title, 40, 40);

    // Group tasks by staff name (fallback to "Unknown")
    const staffToTasks = new Map<string, Task[]>();
    for (const task of tasks) {
      const staffName = task.staff?.name || "Unknown";
      if (!staffToTasks.has(staffName)) {
        staffToTasks.set(staffName, []);
      }
      staffToTasks.get(staffName)!.push(task);
    }

    // Sort staff names alphabetically for consistent layout
    const staffNames = Array.from(staffToTasks.keys()).sort((a, b) =>
      a.localeCompare(b)
    );

    let startY = 60;
    staffNames.forEach((name, index) => {
      const staffTasks = staffToTasks.get(name)!;

      // Add spacing or new page between sections if needed
      if (index > 0) {
        // If near page end, add a new page
        const last = (doc as any).lastAutoTable;
        const lastY = last?.finalY ?? startY;
        if (lastY > 700) {
          doc.addPage();
          startY = 40;
        } else {
          startY = lastY + 24;
        }
      }

      // Section header for staff
      doc.setFontSize(12);
      doc.text(`Staff: ${name}`, 40, startY);

      // Build rows for this staff
      const rows = staffTasks.map((t) => [
        new Date(t.createdAt).toLocaleDateString(),
        t.title,
        t.priority,
        `${t.progress}%`,
        (t.assignedBy?.name as string) || "-",
      ]);

      autoTable(doc as any, {
        startY: startY + 12,
        head: [["Date", "Title", "Priority", "Progress", "Assigned By"]],
        body: rows,
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [33, 150, 243] },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 260 },
          2: { cellWidth: 80 },
          3: { cellWidth: 70 },
          4: { cellWidth: 120 },
        },
        didDrawPage: () => {
          // Ensure the main title stays on first page only (already drawn)
        },
      });

      // Update startY for next section
      startY = ((doc as any).lastAutoTable?.finalY || startY) + 12;
    });

    return doc;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Download Staff Tasks
          </h1>
          <p className="text-gray-300">
            Export all staff tasks and progress as a PDF report
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onBack}
          className="bg-[#465c88] hover:bg-[#465c88]/90 text-white border-[#465c88] hover:border-[#465c88]/90"
        >
          ← Back to Dashboard
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Date Selection Card */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 relative z-[9999]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CalendarIcon2 className="h-5 w-5" />
              Select Date Range
            </CardTitle>
            <CardDescription className="text-gray-300">
              Choose the start and end dates for the PDF export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Start Date
              </label>
              <DatePickerButton
                date={startDate}
                onDateChange={setStartDate}
                placeholder="Select start date"
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                End Date
              </label>
              <DatePickerButton
                date={endDate}
                onDateChange={setEndDate}
                placeholder="Select end date"
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
              />
            </div>

            <Button
              onClick={handleDownload}
              disabled={!startDate || !endDate || isLoading}
              className="w-full bg-[#ff7a30] hover:bg-[#ff7a30]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating PDF...
                </div>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate PDF
                </>
              )}
            </Button>

            {downloadProgress > 0 && downloadProgress < 100 && (
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-[#ff7a30] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
                <div className="text-xs text-gray-300 mt-1 text-center">
                  {downloadProgress < 50
                    ? "Fetching tasks..."
                    : "Generating PDF..."}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Export Information
            </CardTitle>
            <CardDescription className="text-gray-300">
              What will be included in your download
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <Users className="h-4 w-4 text-[#ff7a30]" />
                <span>Staff details (name, email, department)</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <FileText className="h-4 w-4 text-[#ff7a30]" />
                <span>Task information (title, description, progress)</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <CalendarIcon2 className="h-4 w-4 text-[#ff7a30]" />
                <span>Dates (created, due dates)</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="w-4 h-4 text-[#ff7a30]">📝</span>
                <span>Notes and feedback</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/20">
              <p className="text-sm text-gray-400">
                The file will be downloaded as a PDF that includes all task
                details, notes, and feedback for comprehensive reporting.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Date Presets */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10 relative ">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            Quick Date Presets
          </CardTitle>
          <CardDescription className="text-gray-300">
            Use these presets for common time periods to generate PDF reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today);
                lastWeek.setDate(today.getDate() - 7);
                setStartDate(lastWeek);
                setEndDate(today);
              }}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today);
                lastMonth.setMonth(today.getMonth() - 1);
                setStartDate(lastMonth);
                setEndDate(today);
              }}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                const startOfMonth = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  1
                );
                setStartDate(startOfMonth);
                setEndDate(today);
              }}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              This Month
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                const startOfYear = new Date(today.getFullYear(), 0, 1);
                setStartDate(startOfYear);
                setEndDate(today);
              }}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              This Year
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
