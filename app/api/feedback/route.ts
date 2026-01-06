import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get("staffId");
    const managerId = searchParams.get("managerId");
    const type = searchParams.get("type");
    const taskId = searchParams.get("taskId");
    const weeklySummaryId = searchParams.get("weeklySummaryId");

    let whereClause: any = {};

    if (staffId) {
      whereClause.staffId = staffId;
    }

    if (managerId) {
      whereClause.managerId = managerId;
    }

    if (type) {
      whereClause.type = type.toUpperCase();
    }

    if (taskId) {
      whereClause.taskId = taskId;
    }

    if (weeklySummaryId) {
      whereClause.weeklySummaryId = weeklySummaryId;
    }

    const feedback = await db.feedback.findMany({
      where: whereClause,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        weeklySummary: {
          select: {
            id: true,
            summary: true,
            startDate: true,
            endDate: true,
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
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is BK - they cannot give feedback
    if (session.user.role === "bk") {
      return NextResponse.json(
        { error: "BK users cannot give feedback" },
        { status: 403 }
      );
    }

    const {
      content,
      type,
      staffId,
      managerId,
      taskId,
      weeklySummaryId,
      media,
    } = await request.json();

    if (!content || !staffId || !managerId) {
      return NextResponse.json(
        {
          error: "Content, staff ID, and manager ID are required",
        },
        { status: 400 }
      );
    }

    const feedback = await db.feedback.create({
      data: {
        content,
        type: type?.toUpperCase() || "DAILY",
        staffId,
        managerId,
        taskId: taskId || null,
        weeklySummaryId: weeklySummaryId || null,
        media:
          media?.length > 0
            ? {
                create: media.map((mediaItem: any) => ({
                  url: mediaItem.url,
                  filename: mediaItem.filename,
                  type: mediaItem.type,
                  caption: mediaItem.caption || null,
                  key: mediaItem.key || null,
                })),
              }
            : undefined,
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        weeklySummary: {
          select: {
            id: true,
            summary: true,
            startDate: true,
            endDate: true,
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
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Feedback creation error:", error);
    return NextResponse.json(
      { error: "Failed to create feedback" },
      { status: 500 }
    );
  }
}
