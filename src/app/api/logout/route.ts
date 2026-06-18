import { NextResponse } from "next/server";

const authCookies = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
];

export function GET(req: Request) {
  const response = NextResponse.redirect(new URL("/login", req.url));
  for (const cookie of authCookies) {
    response.cookies.set(cookie, "", { maxAge: 0, path: "/" });
  }
  return response;
}
