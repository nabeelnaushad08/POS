import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth(function middleware(req) {
  const { nextUrl } = req;

  // License check via cookie (must be before auth checks)
  const licensed = req.cookies.get("pos-licensed")?.value;
  const isSetupRoute = nextUrl.pathname.startsWith("/setup");
  const isApiSetup = nextUrl.pathname.startsWith("/api/setup");
  const isAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isNextInternal = nextUrl.pathname.startsWith("/_next");
  const isPublicFile = ["/favicon.ico"].includes(nextUrl.pathname);

  if (!licensed && !isSetupRoute && !isApiSetup && !isAuthRoute && !isNextInternal && !isPublicFile) {
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  // If this is a setup route, allow through without auth checks
  if (isSetupRoute || isApiSetup) {
    return NextResponse.next();
  }

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
