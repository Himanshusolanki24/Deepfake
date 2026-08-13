import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

const PUBLIC_PATHS = ["/", "/about", "/technology"];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/auth/") || pathname === "/auth") return true;
  return PUBLIC_PATHS.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
}

const AUTH_REDIRECT_EXCLUDE = ["_next", "favicon", "fonts", "images", "icons", "opengraph"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (AUTH_REDIRECT_EXCLUDE.some((segment) => pathname.includes(segment))) {
    return NextResponse.next({ request });
  }

  const { response, user } = await updateSession(request);

  const isPublic = isPublicPath(pathname);
  const isAuthRoute = pathname.startsWith("/auth/");

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    const next = request.nextUrl.searchParams.get("next");
    const target = next && next.startsWith("/") ? next : "/workspace";
    const home = request.nextUrl.clone();
    home.pathname = target;
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next (files/scripts/images)
     * - favicon.ico, robots.txt, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|fonts|images|icons).*)",
  ],
};
