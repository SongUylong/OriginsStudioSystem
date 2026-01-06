import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { deleteFile } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role");

    let whereClause: any = {};

    if (role) {
      whereClause.role = role.toUpperCase();
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatar: true,
        avatarKey: true,
        telegramChatId: true,
        createdAt: true,
        _count: {
          select: {
            tasksAssigned: true,
            feedbackReceived: true,
            weeklySummaries: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert role to lowercase for compatibility
    type User = {
      id: string;
      name: string;
      email: string;
      role: string;
      department?: string | null;
      avatar?: string | null;
      avatarKey?: string | null;
      telegramChatId?: string | null;
      createdAt: Date;
      _count: {
        tasksAssigned: number;
        feedbackReceived: number;
        weeklySummaries: number;
      };
    };
    const formattedUsers = users.map((user: User) => ({
      ...user,
      role: user.role.toLowerCase(),
      status: "active", // Default status for existing users
      joinDate: user.createdAt.toISOString().split("T")[0],
      lastActive: user.createdAt.toISOString(),
      tasksCompleted: user._count.tasksAssigned,
      department:
        user.department || (user.role === "MANAGER" ? "Management" : "General"),
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role, department } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role.toUpperCase(),
        department:
          department ||
          (role.toUpperCase() === "MANAGER" ? "Management" : "General"),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatar: true,
        avatarKey: true,
        telegramChatId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: {
        ...newUser,
        role: newUser.role.toLowerCase(),
        status: "active",
        joinDate: newUser.createdAt.toISOString().split("T")[0],
        lastActive: newUser.createdAt.toISOString(),
        tasksCompleted: 0,
        department: newUser.department,
      },
    });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, avatar, avatarKey, name, email, role, department } =
      await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Ensure users can only update their own profile (unless they're a manager, but not BK)
    if (
      session.user.id !== userId &&
      (session.user.role === "bk" || session.user.role !== "manager")
    ) {
      return NextResponse.json(
        { error: "You can only update your own profile" },
        { status: 403 }
      );
    }

    // Build update data object
    const updateData: any = {};
    if (avatar !== undefined) updateData.avatar = avatar;
    if (avatarKey !== undefined) updateData.avatarKey = avatarKey;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role.toUpperCase();
    if (department !== undefined) updateData.department = department;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatar: true,
        avatarKey: true,
        telegramChatId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: {
        ...updatedUser,
        role: updatedUser.role.toLowerCase(),
        status: "active",
        joinDate: updatedUser.createdAt.toISOString().split("T")[0],
        lastActive: updatedUser.createdAt.toISOString(),
        department:
          updatedUser.department ||
          (updatedUser.role === "MANAGER" ? "Management" : "General"),
      },
    });
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user with avatar before deletion to delete from R2
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete user (this will cascade delete related records due to schema constraints)
    await db.user.delete({
      where: { id: userId },
    });

    // Delete avatar from R2 if it exists
    if (user.avatarKey) {
      try {
        await deleteFile(user.avatarKey);
        console.log(`Deleted user avatar from R2: ${user.avatarKey}`);
      } catch (error) {
        console.error(
          `Failed to delete user avatar from R2: ${user.avatarKey}`,
          error
        );
        // Don't fail the request if R2 deletion fails, just log it
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
