"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRegisterSchema, UserRegisterInput, ROLES } from "../../../../../shared/types";
import { useAuth } from "../hooks/use-auth"; // We will update this hook to include register
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Gold Standard User Registration Form
 * - Validates against the shared UserRegisterSchema
 * - Handles the registration state and success redirects
 * - Provides immediate feedback for validation errors
 */

export function RegisterForm() {
  const router = useRouter();

  const { mutate: registerUser, isPending } = useMutation({
    mutationFn: (data: UserRegisterInput) => 
      api.post(`/auth/${ROLES.USER}/register`, data),
    onSuccess: () => {
      toast.success("Registration successful! Please check your email for verification.");
      router.push("/login");
    },
    onError: (error: any) => {
      toast.error(error.message || "Registration failed. Please try again.");
    }
  });

  const form = useForm<UserRegisterInput>({
    resolver: zodResolver(UserRegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: UserRegisterInput) => {
    registerUser(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
        <CardDescription>
          Enter your details below to join the Digital Offices platform
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              disabled={isPending}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              disabled={isPending}
              autoComplete="email"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              disabled={isPending}
              autoComplete="new-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Min 8 chars, 1 number, and 1 special character.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Create Account
          </Button>
          
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}