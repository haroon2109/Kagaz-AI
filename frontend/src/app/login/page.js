"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Sparkles, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, guestLogin, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !authLoading) router.push("/dashboard");
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-stretch bg-mesh">
      {/* Left side: Premium Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F766E]/5 items-center justify-center p-12 border-r border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#14B8A6]/10 to-transparent rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#0F766E]/10 to-transparent rounded-full pointer-events-none" />
        
        <div className="max-w-md w-full space-y-8 text-center relative z-10">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold text-[#0F766E] tracking-tight">Kagaz AI Copilot</h2>
            <p className="text-sm font-semibold text-slate-500">
              Grade 40+ worksheets in minutes. Snap a photo, identify place-value learning gaps, and receive daily subreadable plans instantly.
            </p>
          </div>

          {/* Visual Smartphone Scan Representation */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xl max-w-sm mx-auto relative">
            <div className="w-full h-64 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden">
              {/* Phone scanning beam overlay */}
              <div className="absolute inset-x-0 top-1/2 h-1 bg-[#14B8A6] animate-pulse shadow-[0_0_10px_#14B8A6]" />
              
              <div className="space-y-4 text-center font-mono">
                <p className="text-[10px] text-slate-400">Original Student Sheet</p>
                <div className="border border-slate-200 bg-white p-4 rounded-lg shadow-sm w-44 mx-auto text-left">
                  <p className="text-[10px] text-slate-400">Ravi - Roll 14</p>
                  <p className="text-lg font-serif font-extrabold text-slate-800 mt-2">52 - 18 = 44</p>
                  <span className="text-[8px] bg-rose-50 text-rose-500 font-bold px-1 py-0.5 rounded border border-rose-100 mt-1 inline-block">Gap Detected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          {/* Brand Logo & Heading */}
          <div className="space-y-3">
            <img
              src="/logo.png"
              alt="Kagaz AI Logo"
              className="h-12 w-auto object-contain bg-white p-1 rounded-xl border border-slate-100 shadow-sm"
            />
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome Back</h1>
            <p className="text-sm font-semibold text-slate-500">
              Continue helping students learn better.
            </p>
          </div>

          {/* Form Container */}
          <div className="card p-6 sm:p-8 space-y-6">
            {error && (
              <div className="alert alert-error">
                <span>⚠</span> <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <button
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await guestLogin();
                    router.push("/dashboard");
                  } catch (err) {
                    setError(err.message || "Failed to start. Please try again.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting || authLoading}
                className="btn btn-primary w-full cursor-pointer flex items-center justify-center gap-2"
                style={{ width: "100%" }}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading…</span>
                  </>
                ) : (
                  <span>Get Started for Free</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
