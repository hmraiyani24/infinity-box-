import type { Role } from "@/lib/constants";
import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
      needsPasswordSetup?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    username?: string;
    role?: Role;
    needsPasswordSetup?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: Role;
    needsPasswordSetup?: boolean;
  }
}
