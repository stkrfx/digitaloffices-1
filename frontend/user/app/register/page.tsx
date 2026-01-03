"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RegisterForm } from "@/features/auth/components/register-form";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Loader2 } from "lucide-react";

/**
 * Gold Standard Registration Page
 * - Redirects authenticated users to the dashboard
 * - Centers the RegisterForm component for a clean, professional UI
 * - Adheres to Next.js 16+ App Router patterns
 */

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in - Standard Auth Guard pattern
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle loading state for session check
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Prevent flash of content if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          {/* Brand Identity */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg">
            <span className="text-xl font-bold italic">DO</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Join Digital Offices
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create an account to start connecting with experts
          </p>
        </div>

        <RegisterForm />
        
        <p className="px-8 text-center text-xs text-muted-foreground">
          By registering, you agree to our{" "}
          <a href="/terms" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>.
        </p>
      </div>
    </main>
  );
}