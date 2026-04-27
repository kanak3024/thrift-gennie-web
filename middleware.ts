import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // Admin routes — must be logged in + admin role (we'll add role check in Fix 2)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Protected user routes
  const protectedRoutes = [
    "/orders",
    "/checkout",
    "/sell",
    "/settings",
    "/seller",
    "/messages",
    "/wishlist",
  ];

  if (protectedRoutes.some(r => pathname.startsWith(r))) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/orders/:path*",
    "/checkout/:path*",
    "/sell/:path*",
    "/settings/:path*",
    "/seller/:path*",
    "/messages/:path*",
    "/wishlist/:path*",
  ],
};