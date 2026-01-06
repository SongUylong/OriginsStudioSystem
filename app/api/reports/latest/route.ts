import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getUploadSignedUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

function getCurrentWeekRangeFor(day: "SAT") {
  const now = new Date();
  // Monday of current week
  const dayOfWeek = now.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = (dayOfWeek + 6) % 7; // Mon=0
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const end = new Date(monday);
  end.setDate(monday.getDate() + 5); // Mon->Sat: +5 days (Monday to Saturday)
  end.setHours(23, 59, 59, 999);

  return { start: monday, end };
}

async function fetchTasks(start: Date, end: Date) {
  const tasks = await db.task.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: {
      staff: { select: { id: true, name: true } },
      assignedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  return tasks;
}

function buildPdf(tasks: any[], title: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 40, 40);

  // Group tasks by staff name (fallback to "Unknown")
  const staffToTasks = new Map<string, any[]>();
  for (const t of tasks) {
    const staffName = (t.staff?.name as string) || "Unknown";
    if (!staffToTasks.has(staffName)) staffToTasks.set(staffName, []);
    staffToTasks.get(staffName)!.push(t);
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

  return doc.output("arraybuffer");
}

async function uploadPdf(buffer: ArrayBuffer, key: string) {
  const { signedUrl } = await getUploadSignedUrl(key, "application/pdf");
  await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: buffer,
  });
}

export async function GET(request: Request) {
  try {
    // Always generate PDF with current week's data
    const { start, end } = getCurrentWeekRangeFor("SAT");
    const tasks = await fetchTasks(start, end);

    const title = `Tasks Report (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`;
    const pdfBuffer = buildPdf(tasks, title);

    // Include timestamp in filename to ensure uniqueness for each generation
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const key = `reports/${start.getFullYear()}-${
      start.getMonth() + 1
    }-${start.getDate()}_SAT_${timestamp}.pdf`;
    
    await uploadPdf(pdfBuffer, key);

    // Create a permanent PDF download URL that doesn't expire
    const permanentPdfUrl = `${
      process.env.NEXTAUTH_URL || "http://192.168.100.120:3000"
    }/api/reports/pdf?key=${encodeURIComponent(key)}`;

    return NextResponse.json({
      success: true,
      count: tasks.length,
      title,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      pdfUrl: permanentPdfUrl,
    });
  } catch (error) {
    console.error("Latest report generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
