import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      avatar?: string;
      avatarKey?: string;
    } & DefaultSession["user"];
    telegramChatId?: string | null;
  }

  interface User extends DefaultUser {
    role: string;
    avatar?: string;
    avatarKey?: string;
    telegramChatId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string;
    avatar?: string;
    avatarKey?: string;
    telegramChatId?: string | null;
  }
}
