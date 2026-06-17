"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const { user, signUp, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);
    try {
      await signUp(email, password, name);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-950 px-4 py-12 text-white overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="absolute bottom-1/3 right-1/4 -z-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />

      <Card className="w-full max-w-md bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-500 text-white">
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm font-light">
            Sign up to start grading worksheets with educational AI
          </CardDescription>
        </CardHeader>
        {success ? (
          <CardContent className="space-y-4 text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <h3 className="text-xl font-bold">Check your email</h3>
            <p className="text-sm font-light text-slate-400 leading-relaxed">
              We have sent a verification email to <strong className="text-white">{email}</strong>. Please confirm your email to complete registration.
            </p>
            <div className="pt-4">
              <Link href="/login">
                <Button className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
                  Back to Log In
                </Button>
              </Link>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm font-light text-center">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
                <Input
                  type="text"
                  placeholder="Ms. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:ring-offset-slate-950 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
                <Input
                  type="email"
                  placeholder="teacher@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:ring-offset-slate-950 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
                <Input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:ring-offset-slate-950 rounded-xl"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                disabled={submitting || authLoading}
                className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-medium shadow-md transition-all duration-300 py-6 rounded-xl"
              >
                {submitting ? "Creating account..." : "Sign Up"}
              </Button>
              <div className="text-center text-sm text-slate-400 font-light">
                Already have an account?{" "}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                  Log in
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
