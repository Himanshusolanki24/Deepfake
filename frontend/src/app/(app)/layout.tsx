import { AppShell } from "@/components/layout/AppShell";
import { requireAuth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <AppShell>{children}</AppShell>;
}
