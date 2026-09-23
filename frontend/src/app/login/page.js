"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { Sparkles, Mail, Lock, Play } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, guestLogin, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  // Try Demo Class: guest account + fictional Grade 3 class seeded through
  // the REAL evidence engine (no fake analysis, no real children's data).
  const handleDemo = async () => {
    setDemoBusy(true);
    setError("");
    try {
      await guestLogin();
      await api.learning.demoSetup();
      router.push("/today");
    } catch (err) {
      setError("Could not start the demo: " + (err.message || "please try again."));
    } finally {
      setDemoBusy(false);
    }
  };

  // Bounce only users who were ALREADY logged in when the page opened.
  // Redirecting on every `user` change races the submit handlers' own
  // router.push (e.g. guest → /onboarding) and can swallow navigation —
  // the "clicking Get Started does nothing" bug.
  const userAtMount = useRef(undefined); // undefined = not yet known
  useEffect(() => {
    if (authLoading) return;
    if (userAtMount.current === undefined) userAtMount.current = !!user;
    if (userAtMount.current && user) router.push("/dashboard");
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      // First-time users get the guided setup; returning users go to work
      let hasClasses = false;
      try {
        hasClasses = (await api.learning.listClasses()).length > 0;
      } catch (_) {}
      router.push(hasClasses ? "/dashboard" : "/onboarding");
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
            <h2 className="text-3xl font-extrabold text-[#0F766E] tracking-tight">Kagaz AI</h2>
            <p className="text-base font-bold text-slate-700">From student work to the next teaching action.</p>
            <p className="text-sm font-semibold text-slate-500">
              Scan. Understand. Group. Act. Reassess. Kagaz turns a photo of handwritten work into learning evidence, targeted groups, and a 10-minute next step.
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
              src="/logo.svg"
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
                onClick={handleDemo}
                disabled={demoBusy || submitting || authLoading}
                className="btn btn-primary w-full cursor-pointer flex items-center justify-center gap-2"
                style={{ width: "100%" }}
              >
                {demoBusy ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparing demo class…</span>
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    <span>Try Demo Class</span>
                  </>
                )}
              </button>
              <p className="text-xs text-center font-medium text-slate-500 -mt-1">
                A fictional Grade 3 class — scan → understand → group → act → reassess → regroup.
              </p>
              <button
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await guestLogin();
                    // First-time account → guided setup; returning guest → straight to work
                    let hasClasses = false;
                    try {
                      hasClasses = (await api.learning.listClasses()).length > 0;
                    } catch (_) {}
                    router.push(hasClasses ? "/today" : "/onboarding");
                  } catch (err) {
                    setError(err.message || "Failed to start. Please try again.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting || demoBusy || authLoading}
                className="btn btn-ghost w-full cursor-pointer flex items-center justify-center gap-2"
                style={{ width: "100%" }}
              >
                <span>{submitting ? "Loading…" : "Get Started for Free (empty account)"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
