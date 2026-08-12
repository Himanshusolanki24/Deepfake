import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * AUTHENTIQ Middleware
 * 
 * Responsibilities:
 * 1. Refresh Supabase auth session on every request
 * 2. Protect authenticated routes
 * 3. Redirect unauthenticated users to login with preserved destination
 */

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
  "/about",
  "/technology",
];

// Routes that require authentication
const PROTECTED_ROUTE_PREFIXES = [
  "/workspace",
  "/analyze",
  "/analysis",
  "/history",
  "/batch",
  "/evidence",
  "/compare",
  "/reports",
  "/api-keys",
  "/settings",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Skip middleware if Supabase is not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Update request cookies for downstream handling
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        
        // Create new response with updated cookies
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Get the current user (this refreshes the session if needed)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Redirect unauthenticated users trying to access protected routes
  if (!user && isProtectedRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    // Preserve the intended destination
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && pathname.startsWith("/auth/")) {
    const next = request.nextUrl.searchParams.get("next") ?? "/workspace";
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
