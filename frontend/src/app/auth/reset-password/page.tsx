"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWatch } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { PasswordStrength, PasswordRequirements } from "@/components/auth/PasswordStrength";
import { useAuth } from "@/hooks/useAuth";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Include at least one uppercase letter.")
      .regex(/[a-z]/, "Include at least one lowercase letter.")
      .regex(/[0-9]/, "Include at least one number.")
      .regex(/[^A-Za-z0-9]/, "Include at least one special character."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = useWatch({ control: form.control, name: "password" }) ?? "";

  const onSubmit = async (values: ResetForm) => {
    setSubmitting(true);
    const { error } = await updatePassword(values.password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Password updated. You can now sign in.");
    router.push("/auth/login");
  };

  return (
    <div className="space-y-6">
      <div className="lg:hidden">
        <AuthBrand compact />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Choose a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Your password was securely verified. Set a new one below.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
              className="pr-10"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
          {form.formState.errors.password ? (
            <p className="text-xs text-manipulated" role="alert">
              {form.formState.errors.password.message}
            </p>
          ) : (
            <PasswordRequirements password={password} />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.confirmPassword}
              className="pr-10"
              {...form.register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-manipulated" role="alert">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <KeyRound />}
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="font-medium text-info hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
