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

  if (isApiAuthRoute || isPublicApiRoute) {
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
  const isCashierOnly = nextUrl.pathname.startsWith("/reports") ||
    nextUrl.pathname.startsWith("/users") ||
    nextUrl.pathname.startsWith("/inventory");
  const isAdminOnly = nextUrl.pathname.startsWith("/users");

  if (role === "CASHIER" && isCashierOnly) {
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
