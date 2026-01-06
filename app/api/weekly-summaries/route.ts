import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get("staffId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let whereClause: any = {};

    if (staffId) {
      whereClause.staffId = staffId;
    }

    if (startDate && endDate) {
      // For finding summaries that overlap with the date range
      // Find summaries where the date ranges overlap
      whereClause.AND = [
        {
          startDate: {
            lte: new Date(endDate), // Summary starts before or on the end date
          },
        },
        {
          endDate: {
            gte: new Date(startDate), // Summary ends after or on the start date
          },
        },
      ];
    }

    const weeklySummaries = await db.weeklySummary.findMany({
      where: whereClause,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            avatarKey: true,
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
            media: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    // For each weekly summary, fetch task media from that week
    type WeeklySummary = {
      id: string;
      staffId: string;
      startDate: Date;
      endDate: Date;
      staff: {
        id: string;
        name: string;
        email: string;
        avatar: string | null;
        avatarKey: string | null;
      };
      feedback: any;
      // Add other fields as needed
    };
    const enrichedSummaries = await Promise.all(
      weeklySummaries.map(async (summary: WeeklySummary) => {
        // Get all task media from this week
        const taskMedia = await db.taskMedia.findMany({
          where: {
            task: {
              staffId: summary.staffId,
              createdAt: {
                gte: summary.startDate,
                lte: summary.endDate,
              },
            },
          },
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Use task media as the media for the weekly summary
        type TaskMedia = {
          id: string;
          url: string;
          filename: string;
          type: string;
          caption: string | null;
          createdAt: Date;
          key: string | null;
          task: {
            id: string;
            title: string;
          };
        };
        const media = taskMedia.map((m: TaskMedia) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          type: m.type,
          description: m.caption || `From task: ${m.task.title}`,
          uploadedAt: m.createdAt.toISOString(),
          key: m.key ?? undefined,
          source: "task" as const,
          taskId: m.task.id,
          taskTitle: m.task.title,
        }));

        return {
          ...summary,
          media,
        };
      })
    );

    return NextResponse.json({ weeklySummaries: enrichedSummaries });
  } catch (error) {
    console.error("Weekly summaries fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly summaries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { summary, startDate, endDate, staffId } = await request.json();

    if (!summary || !startDate || !endDate || !staffId) {
      return NextResponse.json(
        {
          error: "Summary, start date, end date, and staff ID are required",
        },
        { status: 400 }
      );
    }

    // Check if a weekly summary already exists for this staff and date range
    const existingSummary = await db.weeklySummary.findFirst({
      where: {
        staffId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    let weeklySummary;

    if (existingSummary) {
      // Update existing summary
      weeklySummary = await db.weeklySummary.update({
        where: { id: existingSummary.id },
        data: {
          summary,
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
        },
      });
    } else {
      // Create new summary
      weeklySummary = await db.weeklySummary.create({
        data: {
          summary,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          staffId,
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
        },
      });
    }

    return NextResponse.json({ weeklySummary });
  } catch (error) {
    console.error("Weekly summary creation error:", error);
    return NextResponse.json(
      { error: "Failed to create weekly summary" },
      { status: 500 }
    );
  }
}
