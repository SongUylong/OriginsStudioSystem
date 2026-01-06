import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can access task feed
    if (session.user.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can access task feed" },
        { status: 403 }
      );
    }

    // Fetch all tasks from all staff members
    const tasks = await db.task.findMany({
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            avatarKey: true,
            department: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            filename: true,
            type: true,
            caption: true,
            key: true,
          },
        },
        feedback: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                avatar: true,
                avatarKey: true,
              },
            },
            media: {
              select: {
                id: true,
                url: true,
                filename: true,
                type: true,
                caption: true,
                key: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: [
        {
          priority: "desc", // URGENT first, then HIGH, NORMAL, LOW
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Task feed fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task feed" },
      { status: 500 }
    );
  }
}