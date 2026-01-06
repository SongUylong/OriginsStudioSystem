import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get("staffId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let whereClause: any = {};

    if (staffId) {
      whereClause.staffId = staffId;
    }

    // Handle date range filtering (for weekly reports and incomplete tasks)
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      whereClause.createdAt = {
        gte: start,
        lte: end,
      };

      // If looking for incomplete tasks, add status/progress conditions
      const incomplete = searchParams.get("incomplete") === "true";
      if (incomplete) {
        // Get IDs of tasks that have been continued (exist as continuedFromTaskId in other tasks)
        const continuedTaskIds = await db.task.findMany({
          where: {
            continuedFromTaskId: { not: null },
          },
          select: { continuedFromTaskId: true },
        });

        const excludeIds = continuedTaskIds
          .map((t) => t.continuedFromTaskId)
          .filter((id): id is string => id !== null);

        whereClause.AND = [
          {
            OR: [{ status: { not: "COMPLETED" } }, { progress: { lt: 100 } }],
          },
          // Only include tasks that have NOT been continued to another task
          // This allows both original tasks and continuation tasks to appear,
          // as long as they haven't been continued further
          {
            id: {
              notIn: excludeIds,
            },
          },
        ];
      }
    }
    // Handle single date filtering (for daily tasks)
    else if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      whereClause.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const tasks = await db.task.findMany({
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
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        media: true,
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
        continuedFromTask: {
          select: {
            id: true,
            title: true,
            progress: true,
          },
        },
        continuedToTask: {
          select: {
            id: true,
            title: true,
            progress: true,
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
    console.error("Tasks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      description,
      progress,
      status,
      notes,
      staffId,
      dueDate,
      media,
      continuedFromTaskId,
    } = await request.json();

    if (!title || !description || !staffId) {
      return NextResponse.json(
        { error: "Title, description, and staff ID are required" },
        { status: 400 }
      );
    }

    // Determine status based on progress
    const taskProgress = progress || 0;
    const taskStatus =
      status?.toUpperCase() ||
      (taskProgress === 100 ? "COMPLETED" : "IN_PROGRESS");

    // Create the new task
    const task = await db.task.create({
      data: {
        title,
        description,
        progress: taskProgress,
        status: taskStatus,
        notes,
        staffId,
        dueDate: dueDate ? new Date(dueDate) : null,
        continuedFromTaskId,
        media: media
          ? {
              create: media.map((m: any) => ({
                url: m.url,
                filename: m.filename,
                type: m.type,
                caption: m.caption,
                key: m.key,
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
        media: true,
      },
    });

    // If this is a continuation task, update the original task to mark it as continued
    if (continuedFromTaskId) {
      console.log(
        `Updating original task ${continuedFromTaskId} to mark it as continued to task ${task.id}`
      );
      await db.task.update({
        where: { id: continuedFromTaskId },
        data: { continuedToTask: { connect: { id: task.id } } },
      });
      console.log(`Successfully updated original task ${continuedFromTaskId}`);
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      title,
      description,
      progress,
      status,
      notes,
      dueDate,
      priority,
      userId,
      userRole,
      isAddingNotes = false,
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Get the task details to check if it was assigned by a manager
    const existingTask = await db.task.findUnique({
      where: { id },
      include: {
        staff: true,
        assignedBy: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check authorization for editing assigned tasks
    if (userRole === "staff" && existingTask.assignedById && !isAddingNotes) {
      // Staff can only add notes to assigned tasks, not edit other fields
      return NextResponse.json(
        {
          error:
            "You cannot edit tasks that were assigned to you by a manager. You can only add notes and media.",
          type: "assigned_task_edit",
        },
        { status: 403 }
      );
    }

    // BK users cannot edit tasks
    if (userRole === "bk") {
      return NextResponse.json(
        { error: "BK users cannot edit tasks" },
        { status: 403 }
      );
    }

    // If staff is adding notes to an assigned task, only allow notes and progress updates
    let updateData: any = {};

    if (userRole === "staff" && existingTask.assignedById && isAddingNotes) {
      // Staff can only update notes and progress for assigned tasks
      updateData = {
        ...(notes !== undefined && { notes }),
        ...(progress !== undefined && { progress }),
      };
    } else {
      // Full edit access for managers or own tasks
      updateData = {
        ...(title && { title }),
        ...(description && { description }),
        ...(progress !== undefined && { progress }),
        ...(status && { status: status.toUpperCase() }),
        ...(notes !== undefined && { notes }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(priority && { priority: priority.toUpperCase() }),
      };
    }

    // If progress is being updated, automatically update the status
    let statusUpdate = {};
    if (progress !== undefined) {
      statusUpdate = {
        status: progress === 100 ? "COMPLETED" : "IN_PROGRESS",
      };
    }

    const task = await db.task.update({
      where: { id },
      data: {
        ...updateData,
        ...statusUpdate,
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

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Task update error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const userRole = searchParams.get("userRole");

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Get the task details to check if it was assigned by a manager
    const task = await db.task.findUnique({
      where: { id },
      include: {
        staff: true,
        assignedBy: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check authorization:
    // - Staff can only delete their own tasks that were NOT assigned by a manager
    // - Managers can delete any task they assigned or their own tasks
    if (userRole === "staff") {
      // Staff member trying to delete a task
      if (task.staffId !== userId) {
        return NextResponse.json(
          { error: "You can only delete your own tasks" },
          { status: 403 }
        );
      }

      // Check if the task was assigned by a manager
      if (task.assignedById) {
        return NextResponse.json(
          {
            error:
              "You cannot delete tasks that were assigned to you by a manager. Please contact your manager if you need this task removed.",
            type: "assigned_task",
          },
          { status: 403 }
        );
      }
    } else if (userRole === "manager") {
      // Manager trying to delete a task
      // Managers can delete tasks they assigned or their own tasks
      if (task.assignedById !== userId && task.staffId !== userId) {
        return NextResponse.json(
          { error: "You can only delete tasks you assigned or your own tasks" },
          { status: 403 }
        );
      }
    } else if (userRole === "bk") {
      // BK users cannot delete any tasks
      return NextResponse.json(
        { error: "BK users cannot delete tasks" },
        { status: 403 }
      );
    }

    // Get all media files before deletion to delete from R2
    const taskMedia = await db.taskMedia.findMany({
      where: { taskId: id },
      select: { key: true },
    });

    // First, delete related media and feedback
    await db.taskMedia.deleteMany({
      where: { taskId: id },
    });

    // Delete media files from R2
    for (const media of taskMedia) {
      if (media.key) {
        try {
          await deleteFile(media.key);
          console.log(`Deleted file from R2: ${media.key}`);
        } catch (error) {
          console.error(`Failed to delete file from R2: ${media.key}`, error);
          // Don't fail the request if R2 deletion fails, just log it
        }
      }
    }

    await db.feedback.deleteMany({
      where: { taskId: id },
    });

    // Then delete the task
    await db.task.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Task deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
