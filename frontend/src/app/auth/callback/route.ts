import { NextResponse, type NextRequest } from "next/server";
import { createRequiredClient as createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/workspace";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const type = searchParams.get("type");
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv && forwardedHost) {
        return NextResponse.redirect(`${origin}${type === "recovery" ? "/auth/reset-password" : next}`);
      }
      return NextResponse.redirect(`${origin}${type === "recovery" ? "/auth/reset-password" : next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
