"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { User, Mail, Lock, CheckCircle2, School, Award, Sparkles, BookOpen } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { user, signUp, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  
  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [role, setRole] = useState("Teacher");
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
      // Pass name, schoolName, role metadata inside signUp if backend supports it
      await signUp(email, password, name);
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-stretch bg-mesh">
      {/* Left side: Premium Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F766E]/5 items-center justify-center p-12 border-r border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-[#14B8A6]/10 to-transparent rounded-full pointer-events-none" />
        
        <div className="max-w-md w-full space-y-8 text-center relative z-10">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold text-[#0F766E] tracking-tight">Onboarding Classroom Assistant</h2>
            <p className="text-sm font-semibold text-slate-500">
              Review diagnostic summaries, track concept gaps, and download student reports seamlessly.
            </p>
          </div>

          {/* Teacher reviewing AI report mockup */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl max-w-sm mx-auto text-left space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#0F766E]">
                <BookOpen size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teacher AI Report Preview</p>
                <p className="text-sm font-extrabold text-slate-800">Class 5A Diagnosis</p>
              </div>
            </div>
            
            {/* Donut distribution representation */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-500">Concept Accuracy</p>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                <span className="font-bold text-slate-700">Subtraction Borrowing</span>
                <span className="font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">72% Struggle</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                <span className="font-bold text-slate-700">Place Value System</span>
                <span className="font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">45% Struggle</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Register form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-lg space-y-8 py-8 animate-slide-up">
          {/* Brand Logo & Heading */}
          <div className="space-y-3">
            <img
              src="/logo.png"
              alt="Kagaz AI Logo"
              className="h-12 w-auto object-contain bg-white p-1 rounded-xl border border-slate-100 shadow-sm"
            />
            <h1 className="text-3xl font-extrabold tracking-tight">Create Account</h1>
            <p className="text-sm font-semibold text-slate-500">
              Register as a teacher — Free forever
            </p>
          </div>

            <div className="card p-6 sm:p-8 space-y-5">
              {error && (
                <div className="alert alert-error">
                  <span>⚠</span> <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="field-label">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input input-with-icon"
                      placeholder="e.g. Ms. Priya Sharma"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                    <div className="absolute left-3.5 top-3.5 text-slate-400">
                      <User size={16} />
                    </div>
                  </div>
                </div>

                {/* School Name */}
                <div className="space-y-1">
                  <label className="field-label">School Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input input-with-icon"
                      placeholder="e.g. Kagaz Public School"
                      value={schoolName}
                      onChange={e => setSchoolName(e.target.value)}
                      required
                    />
                    <div className="absolute left-3.5 top-3.5 text-slate-400">
                      <School size={16} />
                    </div>
                  </div>
                </div>

                {/* Role Selector Cards */}
                <div className="space-y-2">
                  <label className="field-label">Role</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "Teacher", label: "Teacher" },
                      { id: "Headmaster", label: "Headmaster" },
                      { id: "Administrator", label: "Admin" }
                    ].map(r => {
                      const active = role === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setRole(r.id)}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${active ? "bg-teal-50/60 border-[#0F766E] text-[#0F766E] font-bold" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                        >
                          <span className="text-sm">{r.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="field-label">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      className="input input-with-icon"
                      placeholder="teacher@school.edu"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                    <div className="absolute left-3.5 top-3.5 text-slate-400">
                      <Mail size={16} />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="field-label">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      className="input input-with-icon"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <div className="absolute left-3.5 top-3.5 text-slate-400">
                      <Lock size={16} />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Minimum 6 characters
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || authLoading}
                  className="btn btn-primary w-full cursor-pointer flex items-center justify-center gap-2"
                  style={{ width: "100%", marginTop: "1.5rem" }}
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating account…</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>

              <div
                className="text-center text-sm pt-4"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span style={{ color: "var(--text-3)" }}>Already have an account? </span>
                <Link
                  href="/login"
                  className="font-bold"
                  style={{ color: "var(--primary)" }}
                >
                  Log In
                </Link>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
