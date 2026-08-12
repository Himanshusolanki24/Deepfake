"use client";

import { useAuthStore } from "@/store/authStore";
import type { AuthUser } from "@/types/auth";
import type { Session } from "@supabase/supabase-js";

export interface UseAuthReturn {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
}

export function useAuth(): UseAuthReturn {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const updatePassword = useAuthStore((s) => s.updatePassword);

  return { user, session, loading, signIn, signUp, signOut, resetPassword, updatePassword };
}
