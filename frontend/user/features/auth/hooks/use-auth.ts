"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { 
  LoginInput, 
  JwtPayload, 
  ApiResponse, 
  Role 
} from "../../../../../shared/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Gold Standard Auth Hook
 * - Uses TanStack Query for caching and revalidation
 * - Provides reactive 'user', 'isLoading', and 'isAuthenticated' states
 * - Handles automatic cache invalidation on login/logout
 */

const AUTH_QUERY_KEY = ["auth-user"];

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // 1. Fetch Current User (Session Check)
  const { 
    data: user, 
    isLoading, 
    isError 
  } = useQuery<JwtPayload | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        // Calls the /auth/me endpoint which returns { id, role }
        return await api.get<JwtPayload>("/auth/me");
      } catch (error) {
        // If 401 or no token, return null (not an app-breaking error)
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // Consider session fresh for 5 mins
    retry: false, // Don't retry on 401s
  });

  // 2. Login Mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: { role: Role; data: LoginInput }) =>
      api.post(`/auth/${credentials.role}/login`, credentials.data),
    onSuccess: (data: any) => {
      // Invalidate the auth query to trigger a refetch of /auth/me
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      toast.success("Welcome back!");
      router.push("/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.message || "Login failed");
    },
  });

  // 3. Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: () => api.post("/auth/logout", {}),
    onSuccess: () => {
      // Clear all queries and redirect
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      toast.info("You have been logged out");
      router.push("/login");
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isError,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}