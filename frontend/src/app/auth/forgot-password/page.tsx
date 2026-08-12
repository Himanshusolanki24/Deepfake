"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { useAuth } from "@/hooks/useAuth";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotForm) => {
    setSubmitting(true);
    await resetPassword(values.email);
    setSubmitting(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-6">
        <div className="lg:hidden">
          <AuthBrand compact />
        </div>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-authentic-soft">
            <MailCheck className="h-6 w-6 text-authentic" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Check your inbox</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            If an account exists for this email, you will receive password reset instructions.
            The link expires after a short time.
          </p>
          <Button variant="outline" className="mt-2" onClick={() => setSent(false)}>
            Resend instructions
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/auth/login" className="font-medium text-info hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="lg:hidden">
        <AuthBrand compact />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the email associated with your account and we&apos;ll send a reset link.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={!!form.formState.errors.email}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-manipulated" role="alert">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <Mail />}
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link href="/auth/login" className="font-medium text-info hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
