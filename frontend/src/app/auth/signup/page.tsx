"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWatch } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { PasswordStrength, PasswordRequirements } from "@/components/auth/PasswordStrength";
import { useAuth } from "@/hooks/useAuth";

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    email: z.string().email("Enter a valid email address."),
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

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const password = useWatch({ control: form.control, name: "password" }) ?? "";

  const onSubmit = async (values: SignupForm) => {
    setSubmitting(true);
    const { error } = await signUp(values.email, values.password, values.fullName);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(
      values.email && /@/i.test(values.email)
        ? "Account created. Check your inbox to confirm your email."
        : "Account created."
    );
    router.push("/auth/login");
  };

  return (
    <div className="space-y-6">
      <div className="lg:hidden">
        <AuthBrand compact />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create your workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Start running explainable authenticity assessments on images, video and audio.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            placeholder="Alex Rivera"
            autoComplete="name"
            aria-invalid={!!form.formState.errors.fullName}
            {...form.register("fullName")}
          />
          {form.formState.errors.fullName && (
            <p className="text-xs text-manipulated" role="alert">
              {form.formState.errors.fullName.message}
            </p>
          )}
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          <Label htmlFor="confirmPassword">Confirm password</Label>
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
          {submitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
          {submitting ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-info hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
