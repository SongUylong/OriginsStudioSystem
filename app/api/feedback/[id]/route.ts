import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const feedback = await db.feedback.findUnique({
      where: {
        id: params.id,
      },
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
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            avatarKey: true,
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

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { content, type } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const feedback = await db.feedback.update({
      where: {
        id: params.id,
      },
      data: {
        content,
        type: type?.toUpperCase() || undefined,
        updatedAt: new Date(),
      },
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
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            avatarKey: true,
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
    console.error("Feedback update error:", error);
    return NextResponse.json(
      { error: "Failed to update feedback" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get feedback with media before deletion to delete from R2
    const feedback = await db.feedback.findUnique({
      where: { id: params.id },
      include: {
        media: {
          select: { key: true },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    // Delete feedback from database
    await db.feedback.delete({
      where: {
        id: params.id,
      },
    });

    // Delete media files from R2
    for (const media of feedback.media) {
      if (media.key) {
        try {
          await deleteFile(media.key);
          console.log(`Deleted feedback media from R2: ${media.key}`);
        } catch (error) {
          console.error(
            `Failed to delete feedback media from R2: ${media.key}`,
            error
          );
          // Don't fail the request if R2 deletion fails, just log it
        }
      }
    }

    return NextResponse.json({ message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("Feedback deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete feedback" },
      { status: 500 }
    );
  }
}
