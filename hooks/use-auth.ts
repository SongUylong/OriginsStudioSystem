import { useSession } from "next-auth/react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "staff" | "manager" | "bk";
  avatar?: string;
  avatarKey?: string;
  telegramChatId?: string | number | null;
}

export function useAuth() {
  const { data: session, status } = useSession();

  const user: User | null = session?.user
    ? {
        id: session.user.id!,
        name: session.user.name!,
        email: session.user.email!,
        role: (session.user.role as "staff" | "manager" | "bk") || "staff",
        avatar: session.user.avatar,
        avatarKey: session.user.avatarKey,
        telegramChatId: session.telegramChatId,
      }
    : null;

  const getCurrentUserId = () => {
    return user?.id;
  };

  return {
    user,
    getCurrentUserId,
    isAuthenticated: !!user,
    loading: status === "loading",
  };
}
