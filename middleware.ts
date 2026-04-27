import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const pathname = req.nextUrl.pathname;

   if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!session) return NextResponse.redirect(new URL("/admin/login", req.url));
    
    // Check is_admin flag
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  const protectedRoutes = ["/orders", "/checkout", "/sell", "/settings", "/seller", "/messages", "/wishlist"];
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