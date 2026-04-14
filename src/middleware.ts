import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth(function middleware(req) {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAuthPage = nextUrl.pathname.startsWith("/login");
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicApiRoute =
    nextUrl.pathname === "/api/seed" ||
    nextUrl.pathname === "/api/health";

  // Public API routes (no auth needed)
  const isPublicSettingsApi =
    nextUrl.pathname === "/api/settings" && req.method === "GET" ||
    nextUrl.pathname.startsWith("/api/printer-settings") && req.method === "GET";

  if (isApiAuthRoute || isPublicApiRoute || isPublicSettingsApi) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Role-based access control
  const role = (req.auth?.user as { role?: string })?.role;

  // Routes accessible only by ADMIN
  const isAdminOnly =
    nextUrl.pathname.startsWith("/users") ||
    nextUrl.pathname.startsWith("/settings");

  // Routes restricted from CASHIER
  const isCashierRestricted =
    nextUrl.pathname.startsWith("/reports") ||
    nextUrl.pathname.startsWith("/users") ||
    nextUrl.pathname.startsWith("/inventory") ||
    nextUrl.pathname.startsWith("/sales") ||
    nextUrl.pathname.startsWith("/suppliers") ||
    nextUrl.pathname.startsWith("/purchases") ||
    nextUrl.pathname.startsWith("/settings");

  if (role === "CASHIER" && isCashierRestricted) {
    return NextResponse.redirect(new URL("/pos", nextUrl));
  }

  if (role === "MANAGER" && isAdminOnly) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)"],
};
