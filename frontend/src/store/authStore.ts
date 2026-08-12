import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  refreshProfile: (userId: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    role: ((user.app_metadata?.role as string | undefined) ?? "user") as AuthUser["role"],
    metadata: (user.user_metadata as Record<string, never>) ?? null,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  setSession: (session) => set({ session, user: toAuthUser(session?.user ?? null) }),
  setLoading: (loading) => set({ loading }),

  refreshProfile: async (userId) => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role")
      .eq("id", userId)
      .maybeSingle();
    set((s) =>
      s.user
        ? {
            user: {
              ...s.user,
              fullName: data?.full_name ?? s.user.fullName,
              avatarUrl: data?.avatar_url ?? s.user.avatarUrl,
              role: data?.role ?? s.user.role,
            },
          }
        : s
    );
  },

  signIn: async (email, password) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  },

  signUp: async (email, password, fullName) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    return {};
  },

  signOut: async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  resetPassword: async (email) => {
    const supabase = getSupabaseBrowserClient();
    const redirectTo = `${
      process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ?? window.location.origin
    }/auth/callback`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) return { error: error.message };
    return {};
  },

  updatePassword: async (newPassword) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  },
}));

/** Initializes auth state from the Supabase session. Call once from Providers. */
export function initAuthHydration(): () => void {
  const supabase = getSupabaseBrowserClient();
  const setSession = useAuthStore.getState().setSession;
  const setLoading = useAuthStore.getState().setLoading;
  const refreshProfile = useAuthStore.getState().refreshProfile;

  void supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) void refreshProfile(data.session.user.id);
    setSession(data.session);
    setLoading(false);
  });

  const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) void refreshProfile(session.user.id);
    setSession(session);
    setLoading(false);
  });

  return () => subscription.subscription.unsubscribe();
}
