import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const { media, userId, userRole } = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    if (!media || !Array.isArray(media) || media.length === 0) {
      return NextResponse.json(
        { error: "Media files are required" },
        { status: 400 }
      );
    }

    // Get the task details to check permissions
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        staff: true,
        assignedBy: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check authorization:
    // - Staff can add media to their own tasks (including assigned ones)
    // - Managers can add media to tasks they assigned or their own tasks
    if (userRole === "staff") {
      if (task.staffId !== userId) {
        return NextResponse.json(
          { error: "You can only add media to your own tasks" },
          { status: 403 }
        );
      }
    } else if (userRole === "manager") {
      if (task.assignedById !== userId && task.staffId !== userId) {
        return NextResponse.json(
          {
            error:
              "You can only add media to tasks you assigned or your own tasks",
          },
          { status: 403 }
        );
      }
    }

    // Add media to the task
    const createdMedia = await db.taskMedia.createMany({
      data: media.map((m: any) => ({
        taskId,
        url: m.url,
        filename: m.filename,
        type: m.type,
        caption: m.caption || null,
        key: m.key || null,
      })),
    });

    // Fetch the updated task with all media
    const updatedTask = await db.task.findUnique({
      where: { id: taskId },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        media: true,
      },
    });

    return NextResponse.json({
      task: updatedTask,
      message: `Successfully added ${media.length} media file(s) to task`,
    });
  } catch (error) {
    console.error("Add media error:", error);
    return NextResponse.json(
      { error: "Failed to add media to task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const mediaId = searchParams.get("mediaId");
    const userId = searchParams.get("userId");
    const userRole = searchParams.get("userRole");

    if (!taskId || !mediaId || !userId || !userRole) {
      return NextResponse.json(
        { error: "Task ID, Media ID, User ID, and User Role are required" },
        { status: 400 }
      );
    }

    // Get the task details to check permissions
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        staff: true,
        assignedBy: true,
        media: {
          where: { id: mediaId },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.media.length === 0) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Check authorization:
    // - Staff can remove media from their own tasks (including assigned ones)
    // - Managers can remove media from tasks they assigned or their own tasks
    if (userRole === "staff") {
      if (task.staffId !== userId) {
        return NextResponse.json(
          { error: "You can only remove media from your own tasks" },
          { status: 403 }
        );
      }
    } else if (userRole === "manager") {
      if (task.assignedById !== userId && task.staffId !== userId) {
        return NextResponse.json(
          {
            error:
              "You can only remove media from tasks you assigned or your own tasks",
          },
          { status: 403 }
        );
      }
    }

    // Get the media details before deletion to delete from R2
    const mediaToDelete = task.media[0];

    // Delete the specific media from database
    await db.taskMedia.delete({
      where: { id: mediaId },
    });

    // Delete the file from R2 if it has a key (private file)
    if (mediaToDelete.key) {
      try {
        await deleteFile(mediaToDelete.key);
        console.log(`Deleted file from R2: ${mediaToDelete.key}`);
      } catch (error) {
        console.error(
          `Failed to delete file from R2: ${mediaToDelete.key}`,
          error
        );
        // Don't fail the request if R2 deletion fails, just log it
      }
    }

    // Fetch the updated task with all media
    const updatedTask = await db.task.findUnique({
      where: { id: taskId },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        media: true,
      },
    });

    return NextResponse.json({
      task: updatedTask,
      message: "Media removed successfully",
    });
  } catch (error) {
    console.error("Remove media error:", error);
    return NextResponse.json(
      { error: "Failed to remove media from task" },
      { status: 500 }
    );
  }
}
