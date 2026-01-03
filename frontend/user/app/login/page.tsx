"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Loader2 } from "lucide-react";

/**
 * Gold Standard Login Page
 * - Handles authenticated redirects (Auth Guard)
 * - Provides a centered, responsive layout
 * - Uses the 'useAuth' hook for reactive session state
 */

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show a loading state while checking the session
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If already authenticated, return null while the redirect happens
  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          {/* Logo Placeholder - replace with actual logo component later */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg">
            <span className="text-xl font-bold italic">DO</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Digital Offices
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back to the user portal
          </p>
        </div>

        <LoginForm />
        
        <p className="px-8 text-center text-xs text-muted-foreground">
          By clicking continue, you agree to our{" "}
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