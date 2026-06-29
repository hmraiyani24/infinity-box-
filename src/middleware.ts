import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { dashboardForRole } from "@/lib/permissions";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (
    path === "/setup" ||
    path === "/api/setup" ||
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  if (path === "/login") {
    const token = await getToken({ req });
    if (token) return NextResponse.redirect(new URL(dashboardForRole(token.role as string), req.url));
    return NextResponse.next();
  }

  if (!(await isSetupComplete(req))) {
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  const token = await getToken({ req });

  const isPublicRoute = path === "/set-password" || path === "/forgot-password";

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token.needsPasswordSetup && path !== "/set-password") {
    return NextResponse.redirect(new URL("/set-password", req.url));
  }

  if (path.startsWith("/superadmin") && token.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL(dashboardForRole(token.role as string), req.url));
  }

  if (path.startsWith("/admin") && !["ADMIN", "SUPER_ADMIN"].includes(token.role as string)) {
    return NextResponse.redirect(new URL(dashboardForRole(token.role as string), req.url));
  }

  if (path.startsWith("/supervisor") && !["SUPERVISOR", "ADMIN", "SUPER_ADMIN"].includes(token.role as string)) {
    return NextResponse.redirect(new URL(dashboardForRole(token.role as string), req.url));
  }

  if (path.startsWith("/viewer") && !["VIEWER", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"].includes(token.role as string)) {
    return NextResponse.redirect(new URL(dashboardForRole(token.role as string), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

async function isSetupComplete(req: NextRequest): Promise<boolean> {
  try {
    const response = await fetch(new URL("/api/setup", req.url), { cache: "no-store" });
    if (!response.ok) return false;
    const body = await response.json().catch(() => ({ isSetupComplete: false }));
    return Boolean(body.isSetupComplete);
  } catch {
    return false;
  }
}
