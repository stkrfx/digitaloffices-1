"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { Toaster } from "sonner";

/**
 * Gold Standard Global Providers
 * - TanStack Query v5 for server state management
 * - Sonner for accessible, rich notifications
 * - React Query Devtools for local development
 */

export default function Providers({ children }: { children: React.ReactNode }) {
  // Initialize QueryClient inside the component with useState 
  // to ensure a single instance per browser session/Next.js request.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute stale time as default
            retry: 1, // Minimize unnecessary retries for failed requests
            refetchOnWindowFocus: false, // Prevent unexpected refetches during navigation
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* RichColors and closeButton provide a better UX as per 2025 standards */}
      <Toaster position="top-right" richColors closeButton />
      
      {/* Devtools only active in development mode */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}