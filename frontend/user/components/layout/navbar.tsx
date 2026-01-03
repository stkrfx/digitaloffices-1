"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  LogOut, 
  User, 
  Calendar, 
  LayoutDashboard, 
  Settings,
  Menu,
  Bell
} from "lucide-react";

/**
 * Gold Standard Authenticated Navbar
 * - Responsive design with mobile considerations
 * - Real-time session state via useAuth
 * - Secure logout handling with automated redirection
 * - Adheres to 2025 SaaS UI patterns (Backdrop blur, Sticky header)
 */

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  // The Navbar only renders in an authenticated state for the dashboard area
  if (!isAuthenticated || !user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Brand Identity */}
          <Link href="/dashboard" className="flex items-center space-x-2 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold italic shadow-sm">
              DO
            </div>
            <span className="hidden font-bold text-xl tracking-tight sm:inline-block">
              Digital Offices
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Button variant="ghost" asChild className="gap-2">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" asChild className="gap-2">
              <Link href="/bookings">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                My Bookings
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/experts">Find Experts</Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Icons */}
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Bell className="h-5 w-5" />
          </Button>
          
          <Separator orientation="vertical" className="mx-2 h-6 hidden sm:block" />

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                  <span className="text-sm font-bold uppercase">
                    {user.role.charAt(0)}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Account</p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    Role: {user.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Preferences</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive"
                onClick={() => logout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle (Functionality to be added in Mobile Nav component) */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}