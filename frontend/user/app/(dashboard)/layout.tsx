"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Navbar } from "@/components/layout/navbar";
import { Loader2 } from "lucide-react";

/**
 * Gold Standard Protected Dashboard Layout
 * - Implements a Route-Level Auth Guard
 * - Provides a consistent shell for all authenticated user pages
 * - Uses TanStack Query session state to prevent "flash of unauthenticated content"
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Prevent rendering the dashboard shell while checking session
  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Securing your session...
        </p>
      </div>
    );
  }

  // If not authenticated, return null while the redirect happens
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Universal Authenticated Navbar */}
      <Navbar />

      <main className="flex-1">
        {/* The container class ensures consistent padding and max-width 
           across all dashboard sub-pages (experts, bookings, etc.) 
        */}
        <div className="container py-8 md:py-10">
          {children}
        </div>
      </main>

      {/* Optional: Dashboard Footer could be added here */}
    </div>
  );
}