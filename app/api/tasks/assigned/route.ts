import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get("managerId");

    let whereClause: any = {
      assignedById: {
        not: null,
      },
    };

    if (managerId) {
      whereClause.assignedById = managerId;
    }

    const tasks = await db.task.findMany({
      where: whereClause,
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
      orderBy: [
        {
          priority: "asc", // URGENT first (enum order: LOW, NORMAL, HIGH, URGENT)
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
