"use server";

/**
 * AUTHENTIQ Server Actions for Authentication
 *
 * These server actions provide progressive enhancement support for auth operations
 * alongside the client-side auth store. They enable SSR-friendly authentication
 * and better integration with Next.js form actions.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthError } from "@supabase/supabase-js";

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Sign in with email and password.
 *
 * @param email - User email
 * @param password - User password
 * @param redirectTo - Path to redirect to after successful login
 */
export async function signInAction(
  email: string,
  password: string,
  redirectTo: string = "/workspace"
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: formatAuthError(error),
    };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

/**
 * Sign up with email, password, and optional full name.
 *
 * @param email - User email
 * @param password - User password
 * @param fullName - Optional full name (stored in user_metadata)
 */
export async function signUpAction(
  email: string,
  password: string,
  fullName?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
    },
  });

  if (error) {
    return {
      success: false,
      error: formatAuthError(error),
    };
  }

  revalidatePath("/", "layout");

  // If email confirmation is required, stay on page
  // Otherwise, redirect to workspace
  return {
    success: true,
    error: undefined,
  };
}

/**
 * Sign out the current user.
 */
export async function signOutAction(): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      success: false,
      error: formatAuthError(error),
    };
  }

  revalidatePath("/", "layout");
  redirect("/auth/login");
}

/**
 * Send a password reset email.
 *
 * @param email - User email
 */
export async function resetPasswordAction(email: string): Promise<ActionResult> {
  const supabase = await createClient();

  const redirectTo = `${process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return {
      success: false,
      error: formatAuthError(error),
    };
  }

  // Always return success to avoid revealing if email exists
  return {
    success: true,
  };
}

/**
 * Update the user's password (after reset or while logged in).
 *
 * @param newPassword - New password
 */
export async function updatePasswordAction(newPassword: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return {
      success: false,
      error: formatAuthError(error),
    };
  }

  revalidatePath("/", "layout");

  return {
    success: true,
  };
}

/**
 * Sign in with an OAuth provider (Google, GitHub, Microsoft).
 *
 * @param provider - OAuth provider name
 * @param redirectTo - Path to redirect to after successful login
 */
export async function signInWithOAuthAction(
  provider: "google" | "github" | "microsoft",
  redirectTo: string = "/workspace"
): Promise<ActionResult> {
  const supabase = await createClient();

  const redirectUrl = `${process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (error) {
    return {
      success: false,
      error: formatAuthError(error),
    };
  }

  // Redirect to OAuth provider
  if (data.url) {
    redirect(data.url);
  }

  return {
    success: true,
  };
}

/**
 * Exchange an auth code for a session (used in OAuth callback).
 *
 * @param code - The auth code from the callback URL
 */
export async function exchangeCodeForSessionAction(code: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return {
      success: false,
      error: formatAuthError(error),
    };
  }

  revalidatePath("/", "layout");

  return {
    success: true,
  };
}

/**
 * Get the current authenticated user.
 * Useful for server components that need user info.
 */
export async function getAuthUserAction(): Promise<{
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
    role: profile?.role ?? "user",
  };
}

/**
 * Check if the current user is authenticated.
 */
export async function isAuthenticatedAction(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user !== null;
}

/**
 * Format Supabase auth errors into user-friendly messages.
 */
function formatAuthError(error: AuthError): string {
  switch (error.message) {
    case "Invalid login credentials":
      return "Invalid email or password. Please try again.";
    case "Email not confirmed":
      return "Please check your inbox and confirm your email address.";
    case "User already registered":
      return "An account with this email already exists. Try signing in instead.";
    case "Password should be at least 6 characters":
      return "Password must be at least 6 characters long.";
    case "New password should be different from the old password.":
      return "Your new password must be different from your current password.";
    case "Signups not allowed":
      return "New account registration is currently disabled.";
    default:
      return error.message || "An unexpected error occurred. Please try again.";
  }
}
