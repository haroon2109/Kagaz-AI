"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">
              Kagaz AI
            </span>
          </Link>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600"
          >
            Dashboard
          </Link>
          
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-xs text-slate-500 hidden sm:inline-block font-light">
                {user.email}
              </span>
              <Button
                variant="ghost"
                onClick={signOut}
                className="text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" className="text-slate-600 hover:text-indigo-600">
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
