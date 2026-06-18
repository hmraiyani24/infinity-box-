import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { compareSecret } from "@/lib/otp";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        otp: { label: "Login Code", type: "text" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim().toLowerCase();
        if (!username) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.isActive) return null;

        if (credentials?.otp) {
          if (!user.isFirstLogin || user.otpUsed || !user.otpHash || !user.otpExpiresAt) return null;
          if (new Date() > user.otpExpiresAt) throw new Error("OTP_EXPIRED");
          const valid = await compareSecret(credentials.otp, user.otpHash);
          if (!valid) return null;

          return {
            id: user.id,
            name: user.displayName,
            username: user.username,
            role: user.role,
            needsPasswordSetup: true,
          } as any;
        }

        if (credentials?.password) {
          if (user.isFirstLogin || !user.passwordHash) return null;
          const valid = await compareSecret(credentials.password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user.id,
            name: user.displayName,
            username: user.username,
            role: user.role,
            needsPasswordSetup: false,
          } as any;
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.needsPasswordSetup = Boolean((user as any).needsPasswordSetup);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as Role;
        session.user.needsPasswordSetup = Boolean(token.needsPasswordSetup);
      }
      return session;
    },
  },
};
