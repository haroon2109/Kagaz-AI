"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import ApiStatusBanner from "@/components/api-status-banner";
import {
  Users,
  Camera,
  Compass,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  ClipboardList,
  Sparkles,
  PartyPopper,
  Eye,
} from "lucide-react";

/**
 * Onboarding — animated 3-step wizard for first-time teachers.
 *
 *   1. Create your class    → real class via POST /classes (names optional)
 *   2. Scan your first work → animated scan-beam moment through the REAL OCR pipeline
 *   3. See today's action   → the payoff: Today's Action for the created class
 *
 * Motion: CSS-only utilities from globals.css (step-in, pop-in, scan-beam,
 * ripple, chip-reveal, step-glow, float, indeterminate) — no animation deps.
 * All animations are disabled under prefers-reduced-motion.
 */

const STEPS = [
  { id: 1, title: "Create your class", icon: Users },
  { id: 2, title: "Scan your first work", icon: Camera },
  { id: 3, title: "See today's action", icon: Compass },
];

const GRADES = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Nursery–5 (multi)"];

// Deterministic doc mock — same rendered lines during scanning vs. success
const DOC_LINES = [
  { text: "Ravi — Roll 14", dim: true },
  { text: "Q1. 23 + 14 = 37", dim: false },
  { text: "Q2. 45 − 21 = 24", dim: false },
  { text: "Q3. 42 − 17 = 25", dim: false },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Step 1 state (mirrors the /classes form so behavior is consistent)
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("Grade 3");
  const [subject, setSubject] = useState("mathematics");
  const [rosterText, setRosterText] = useState("");
  const [createdClass, setCreatedClass] = useState(null);
  const [existingClasses, setExistingClasses] = useState([]);

  // Step 2 state
  const [scanState, setScanState] = useState("idle"); // idle | scanning | done
  const [scanId, setScanId] = useState(null);
  const [scanError, setScanError] = useState("");
  const fileRef = useRef(null);

  // Animated counter for the "understanding" phase copy in step 2
  const [scanStage, setScanStage] = useState(0);
  const stageTimer = useRef(null);

  const SCAN_STAGES = [
    "Reading the handwriting…",
    "Matching answers to competencies…",
    "Looking for learning patterns…",
  ];

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // If the teacher already has classes, step 1 is pre-completed
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await api.learning.listClasses();
        if (cancelled) return;
        setExistingClasses(list || []);
        if ((list || []).length > 0 && step === 1 && !createdClass) {
          setStep(2);
        }
      } catch {
        // Backend unreachable — stay on step 1; the retry banner covers it
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Cycle reassurance copy while the OCR pipeline runs
  useEffect(() => {
    if (scanState !== "scanning") {
      if (stageTimer.current) clearInterval(stageTimer.current);
      return;
    }
    stageTimer.current = setInterval(() => {
      setScanStage((s) => Math.min(s + 1, SCAN_STAGES.length - 1));
    }, 3500);
    return () => clearInterval(stageTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState]);

  const parseRoster = useCallback(() => {
    return rosterText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.split(",");
        return { name: (m[0] || "").trim(), grade: (m[1] || "").trim() || null };
      });
  }, [rosterText]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please give your class a name.");
      return;
    }
    setBusy(true);
    try {
      const split = parseRoster();
      const cls = await api.learning.createClass({
        name: name.trim(),
        grade,
        subject,
        student_names: split.map((s) => s.name),
        student_grades: split.map((s) => s.grade),
      });
      setCreatedClass(cls);
      setStep(2); // animate-slide-in via step transition
    } catch (err) {
      setError(err.message || "Could not create the class. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const goToStep = (n) => {
    setStep(n);
    if (n === 2) {
      setScanStage(0);
    }
  };

  // Step 2: one guided scan through the real upload + OCR pipeline
  const handleScan = async (file) => {
    if (!file || !createdClass) return;
    setScanError("");
    setScanStage(0);
    setScanState("scanning");
    try {
      const up = await api.worksheets.upload(file);
      const created = await api.worksheets.create({
        title: file.name || "First scan",
        image_url: up.image_url,
      });
      setScanId(created.id);
      // Poll the real pipeline — same states the review screen uses
      const deadline = Date.now() + 90_000;
      let pollDelay = 2000;
      while (Date.now() < deadline) {
        const w = await api.worksheets.get(created.id);
        if (w.status === "ocr_complete" || w.status === "completed") {
          setScanState("done");
          return;
        }
        if (w.status === "failed") {
          setScanState("idle");
          setScanError(
            "The AI could not read that image. A clear, well-lit photo of handwritten work works best — you can also continue and try later."
          );
          return;
        }
        await new Promise((r) => setTimeout(r, pollDelay));
        pollDelay = Math.min(pollDelay + 1000, 5000);
      }
      // Timed out waiting
      setScanState("idle");
      setScanError("This is taking longer than expected. You can continue — the scan keeps processing.");
    } catch (err) {
      setScanState("idle");
      setScanError(err.message || "Upload failed. Check your connection and try again.");
    }
  };

  const handleFinish = () => {
    if (createdClass?.id) {
      router.push(`/today?class=${createdClass.id}`);
    } else if (existingClasses.length > 0) {
      router.push("/today");
    } else {
      router.push("/classes");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-mesh">
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="page-header">
          <div className="max-w-2xl mx-auto w-full">
            <p className="text-xs font-extrabold uppercase tracking-widest animate-fade-in" style={{ color: "var(--primary)" }}>
              Welcome to Kagaz AI
            </p>
            <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight mt-1 animate-slide-up">
              Let's set up in 3 steps
            </h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full p-6 md:p-8 space-y-6 flex-1">
          {/* Animated progress indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const state = step > s.id ? "done" : step === s.id ? "current" : "todo";
              return (
                <React.Fragment key={s.id}>
                  {i > 0 && (
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: state === "todo" ? "0%" : "100%", background: "var(--primary)" }}
                      />
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-xs font-extrabold whitespace-nowrap transition-all duration-300 ${
                      state === "current" ? "animate-step-glow" : ""
                    }`}
                    style={{
                      borderColor: state === "todo" ? "var(--border)" : "var(--primary)",
                      background: state === "current" ? "var(--primary)" : state === "done" ? "var(--success-light)" : "transparent",
                      color: state === "current" ? "#fff" : state === "done" ? "var(--success-text)" : "var(--text-3)",
                    }}
                  >
                    {state === "done" ? (
                      <Check size={13} className="animate-pop-in" />
                    ) : (
                      <Icon size={13} className={state === "current" ? "animate-float" : ""} />
                    )}
                    <span className="hidden sm:inline">{s.title}</span>
                    <span className="sm:hidden">{s.id}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {error && <ApiStatusBanner variant="error" title={error} onRetry={() => setError("")} retryLabel="Dismiss" />}

          {/* ── STEP 1: Create class ─────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleCreateClass} className="card p-6 md:p-8 space-y-5 animate-step-in">
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-slate-900">Step 1 — Create your class</h2>
                <p className="text-sm text-slate-500 font-medium">
                  Takes 30 seconds. You can always edit details later.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Class name *</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class 3B" autoFocus />
                </div>
                <div>
                  <label className="field-label">Grade</label>
                  <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
                    {GRADES.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label">Subject focus</label>
                  <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option value="mathematics">Mathematics</option>
                    <option value="literacy">Literacy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">
                  Students — paste names, one per line <span className="font-normal text-slate-400">(optional — add later)</span>
                </label>
                <textarea
                  className="input font-mono text-sm"
                  rows={4}
                  value={rosterText}
                  onChange={(e) => setRosterText(e.target.value)}
                  placeholder={"Aarav\nBhavna\nChirag\nDiya"}
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Multi-grade? Add the grade after a comma, e.g. <code className="font-mono">Aarav, Grade 2</code>
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 animate-fade-in">
                <Sparkles size={14} className="flex-shrink-0 animate-float" style={{ color: "var(--primary)" }} />
                <span>
                  New to Kagaz?{" "}
                  <Link href="/demo" className="font-bold underline" style={{ color: "var(--primary)" }}>
                    Try the demo class
                  </Link>{" "}
                  instead — 36 fictional students, zero setup.
                </span>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={busy} className="btn btn-primary font-bold cursor-pointer">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  <span>{busy ? "Creating…" : "Create class & continue"}</span>
                </button>
                <button type="button" onClick={() => goToStep(2)} className="btn btn-ghost font-bold cursor-pointer">
                  I'll do this later
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: First scan — the animated moment ─────────────── */}
          {step === 2 && (
            <div className="card p-6 md:p-8 space-y-5 animate-step-in">
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-slate-900">Step 2 — Scan your first work</h2>
                <p className="text-sm text-slate-500 font-medium">
                  Any handwritten work photo works — Kagaz reads it and maps it to competencies.
                </p>
              </div>

              {scanError && (
                <ApiStatusBanner
                  variant="error"
                  title={scanError}
                  retryLabel="Pick another photo"
                  onRetry={() => fileRef.current?.click()}
                  retrying={scanState === "scanning"}
                />
              )}

              {scanState === "idle" && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="drop-zone w-full p-10 flex flex-col items-center justify-center gap-3 animate-fade-in"
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-float" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                    <Camera size={26} />
                  </div>
                  <p className="font-extrabold text-slate-800">Take or choose a photo</p>
                  <p className="text-xs text-slate-500 font-semibold">
                    JPG or PNG · works best with good lighting · nothing is shared outside your account
                  </p>
                </button>
              )}

              {scanState === "scanning" && (
                <div className="rounded-2xl overflow-hidden animate-fade-in" style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}>
                  {/* Document mock with sweeping scan beam */}
                  <div className="relative bg-white px-8 py-7 mx-6 mt-6 rounded-xl border-2 border-slate-200 shadow-sm">
                    <div className="space-y-3">
                      {DOC_LINES.map((line, i) => (
                        <p
                          key={i}
                          className={`font-serif text-lg ${line.dim ? "text-slate-400 text-sm" : "text-slate-900 font-bold"} transition-colors duration-500`}
                        >
                          {line.text}
                        </p>
                      ))}
                    </div>
                    {/* The beam */}
                    <div
                      className="animate-scan-beam absolute left-0 right-0 h-1 rounded-full pointer-events-none"
                      style={{
                        background: "linear-gradient(90deg, transparent, var(--primary), transparent)",
                        boxShadow: "0 0 12px 2px rgba(15, 118, 110, 0.45)",
                      }}
                    />
                    {/* Corner brackets — "document detected" framing */}
                    <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 rounded-tl" style={{ borderColor: "var(--primary)" }} />
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 rounded-tr" style={{ borderColor: "var(--primary)" }} />
                    <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 rounded-bl" style={{ borderColor: "var(--primary)" }} />
                    <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 rounded-br" style={{ borderColor: "var(--primary)" }} />
                  </div>

                  {/* Progress + stage copy */}
                  <div className="px-6 py-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
                      <p key={scanStage} className="text-sm font-extrabold animate-fade-in" style={{ color: "var(--primary-dark, var(--primary))" }}>
                        {SCAN_STAGES[scanStage]}
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="animate-indeterminate h-full w-1/3 rounded-full" style={{ background: "var(--primary)" }} />
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">
                      Usually 10–30 seconds · your image stays private in your account
                    </p>
                  </div>
                </div>
              )}

              {scanState === "done" && (
                <div className="relative rounded-2xl p-8 flex flex-col items-center gap-3 text-center animate-pop-in" style={{ background: "var(--success-light)" }}>
                  {/* Ripple behind the check */}
                  <div className="relative">
                    <div className="animate-ripple absolute inset-0 rounded-full" style={{ background: "var(--success)" }} />
                    <div className="relative w-14 h-14 rounded-full flex items-center justify-center animate-pop-in" style={{ background: "var(--success)", color: "#fff" }}>
                      <Check size={28} />
                    </div>
                  </div>
                  <p className="font-extrabold text-lg" style={{ color: "var(--success-text)" }}>
                    First scan read successfully!
                  </p>
                  <Link href={`/worksheet/${scanId}`} className="btn btn-ghost btn-sm font-bold cursor-pointer animate-fade-in">
                    <Eye size={14} />
                    <span>See what Kagaz read</span>
                  </Link>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  handleScan(f);
                }}
              />

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-slate-500 font-semibold animate-fade-in">
                  Skipping is fine — your class works without any scans yet.
                </p>
                <button onClick={() => goToStep(3)} className="btn btn-primary font-bold cursor-pointer">
                  {scanState === "done" ? <Check size={16} className="animate-pop-in" /> : <ArrowRight size={16} />}
                  <span>Continue</span>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Today's action ───────────────────────────────── */}
          {step === 3 && (
            <div className="card p-6 md:p-8 space-y-6 animate-step-in text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center animate-pop-in" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                <PartyPopper size={30} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold text-slate-900">
                  You're all set{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}!
                </h2>
                <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">
                  {createdClass
                    ? `${createdClass.name} is ready. Kagaz will turn every scan into evidence, groups, and a 10-minute next step.`
                    : "Your classes are ready. Kagaz turns scans into evidence, groups, and a 10-minute next step."}
                </p>
              </div>

              {/* Staggered cheat-sheet reveal — the daily loop */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
                {[
                  { icon: Camera, label: "Scan work", desc: "Photos become evidence", href: createdClass ? `/assess?class=${createdClass.id}` : "/assess" },
                  { icon: Users, label: "See groups", desc: "Who needs what, at a glance", href: createdClass ? `/groups?class=${createdClass.id}` : "/groups" },
                  { icon: ClipboardList, label: "Today's action", desc: "Your 10-minute next step", href: createdClass ? `/today?class=${createdClass.id}` : "/today" },
                ].map((c, i) => {
                  const Icon = c.icon;
                  return (
                    <Link
                      key={c.label}
                      href={c.href}
                      className="animate-chip-reveal rounded-xl border-2 p-4 space-y-1.5 no-underline hover:border-teal-600 transition-colors"
                      style={{ borderColor: "var(--border)", background: "var(--surface)", animationDelay: `${i * 120}ms` }}
                    >
                      <Icon size={18} style={{ color: "var(--primary)" }} />
                      <p className="font-extrabold text-sm text-slate-900">{c.label}</p>
                      <p className="text-xs text-slate-500 font-semibold">{c.desc}</p>
                    </Link>
                  );
                })}
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button onClick={handleFinish} className="btn btn-primary btn-lg font-bold cursor-pointer">
                  <Compass size={18} className="animate-float" />
                  <span>Go to Today's Action</span>
                </button>
              </div>
              <button onClick={() => goToStep(2)} className="btn btn-ghost btn-sm font-bold cursor-pointer">
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
