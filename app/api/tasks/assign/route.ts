import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { sendTelegramMessage } from "@/lib/telegram";
export async function POST(request: NextRequest) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can assign tasks, but not BK users
    if (session.user.role === "bk" || session.user.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can assign tasks" },
        { status: 403 }
      );
    }

    const { staffId, title, description, dueDate, priority, managerId } =
      await request.json();

    if (!staffId || !title || !description || !managerId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the staff member exists
    const staffMember = await db.user.findUnique({
      where: { id: staffId, role: "STAFF" },
      select: {
        id: true,
        name: true,
        telegramChatId: true, // Make sure to select this field
      },
    });

    if (!staffMember) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Verify the manager exists
    const manager = await db.user.findUnique({
      where: { id: managerId, role: "MANAGER" },
    });

    if (!manager) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    // Create the task
    const task = await db.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority ? priority.toUpperCase() : "NORMAL",
        staffId,
        assignedById: managerId,
        status: "IN_PROGRESS",
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    // Send Telegram notification if user has connected their account
    if (staffMember.telegramChatId) {
      try {
        const message = `📢 *New Task Assigned!*\n\n*Task:* ${
          task.title
        }\n*Description:* ${task.description}\n*Priority:* ${
          task.priority
        }\n*Due Date:* ${
          task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"
        }\n*Assigned by:* ${manager.name}`;
        await sendTelegramMessage(staffMember.telegramChatId, message);
        console.log(
          `Telegram notification sent to ${staffMember.name} (${staffMember.telegramChatId})`
        );
      } catch (telegramError) {
        console.error("Failed to send Telegram notification:", telegramError);
        // Don't fail the entire request if Telegram notification fails
      }
    } else {
      console.log(`No Telegram chat ID found for user ${staffMember.name}`);
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error("Error assigning task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
