import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getUploadSignedUrl, getPrivateFileSignedUrl } from "@/lib/storage";

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
  const { signedUrl, privateUrl } = await getUploadSignedUrl(
    key,
    "application/pdf"
  );
  await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: buffer,
  });
  return privateUrl;
}

async function findUserByName(name: string) {
  const user = await db.user.findFirst({ where: { name } });
  return user;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode"); // sat|auto
    const today = new Date();
    const weekday = today.getDay(); // 6=Sat

    let target: "SAT" | null = null;
    // If mode is explicitly "sat", always generate PDF regardless of day
    if (mode === "sat") {
      target = "SAT";
    } else if (weekday === 6) {
      target = "SAT"; // Saturday (auto mode)
    }

    if (!target) {
      return NextResponse.json(
        { message: "Not Saturday; skipping." },
        { status: 200 }
      );
    }

    const { start, end } = getCurrentWeekRangeFor(target);
    const tasks = await fetchTasks(start, end);

    const title = `Tasks Report (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`;
    const pdfBuffer = buildPdf(tasks, title);

    // Include timestamp in filename to ensure uniqueness for each generation
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const key = `reports/${start.getFullYear()}-${
      start.getMonth() + 1
    }-${start.getDate()}_SAT_${timestamp}.pdf`;
    const privateUrl = await uploadPdf(pdfBuffer, key);
    // Create a permanent PDF download URL that doesn't expire
    const permanentPdfUrl = `${
      process.env.NEXTAUTH_URL || "http://192.168.100.120:3000"
    }/api/reports/pdf?key=${encodeURIComponent(key)}`;

    // Determine recipients: ALWAYS only the specified user IDs + additional chat ID
    let chatIdsToUse: string[] = [];
    const fixedIds = ["cme8bv80n00000swo16enzbxp", "cme8bv89h00010swo8kk9gus7"];
    const recipients = await db.user.findMany({
      where: { id: { in: fixedIds }, telegramChatId: { not: null } },
      select: { telegramChatId: true },
    });
    chatIdsToUse = recipients
      .map((u) => u.telegramChatId)
      .filter((id): id is string => !!id);

    // Add the additional Telegram chat ID
    chatIdsToUse.push("1000901678");

    if (!chatIdsToUse.length) {
      return NextResponse.json(
        { error: "No manager Telegram chat IDs found" },
        { status: 404 }
      );
    }

    const message = `📄 Weekly Tasks Report\n${title}`;
    try {
      await Promise.all(
        chatIdsToUse.map((chatId) =>
          sendTelegramMessage(chatId, message, {
            parseMode: null,
            replyMarkup: {
              inline_keyboard: [
                [{ text: "Download PDF", url: permanentPdfUrl }],
              ],
            },
            disablePreview: true,
          })
        )
      );
    } catch (e) {
      console.error("Telegram send failed:", e);
      return NextResponse.json(
        { error: "Telegram send failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      count: tasks.length,
      url: privateUrl,
      permanentUrl: permanentPdfUrl,
    });
  } catch (error) {
    console.error("Weekly report error:", error);
    return NextResponse.json(
      { error: "Failed to generate/send report" },
      { status: 500 }
    );
  }
}
