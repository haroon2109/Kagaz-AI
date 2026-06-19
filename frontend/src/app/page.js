"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";
import { HeroSection } from "@/components/hero-section";
import { 
  Camera, 
  Brain, 
  TrendingUp, 
  FileText, 
  Sparkles,
  ChevronRight,
  Clock,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Play,
  Check,
  CheckCircle,
  ShieldCheck,
  Zap,
  Globe,
  Loader2,
  HelpCircle,
  CheckSquare,
  BarChart3,
  Lightbulb,
  FileImage,
  Layers,
  Smartphone,
  Wifi,
  Upload,
  Users
} from "lucide-react";

export default function LandingPage() {
  const { t, language } = useLanguage();
  const [previewTab, setPreviewTab] = useState("upload");

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen" style={{ color: "var(--text)" }}>

      {/* ── Section 1: Hero Split ───────────────────────────────────────── */}
      <HeroSection 
        onTryDemoClick={() => scrollToSection("problem-section")}
        onWatchVideoClick={() => scrollToSection("screenshots-section")}
      />

      {/* ── Section 2: Problem ───────────────────────────────────────── */}
      <section id="problem-section" className="py-20 px-6 max-w-7xl mx-auto relative z-10 border-t border-slate-200">
        <div className="space-y-12 max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-extrabold text-[#0F766E] uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full">
              The Problem
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-heading text-[#0F172A]">
              50%+ students struggle with foundational learning.
            </h2>
            <p className="text-base leading-relaxed text-[#475569] font-medium">
              Teachers manage classrooms of 40+ students, making personalized assessment impossible. Common conceptual gaps like place value and borrowing go completely unnoticed under traditional red-pen ticks.
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            <div className="card p-6 bg-white border-slate-200 text-center space-y-2">
              <p className="text-4xl font-extrabold text-rose-500">50%+</p>
              <h4 className="font-bold text-sm text-[#0F172A]">Students Struggle</h4>
              <p className="text-xs text-[#475569] leading-relaxed">
                Fail to grasp foundational concepts by Class 5.
              </p>
            </div>

            <div className="card p-6 bg-white border-slate-200 text-center space-y-2">
              <p className="text-4xl font-extrabold text-orange-500">40 : 1</p>
              <h4 className="font-bold text-sm text-[#0F172A]">Classroom Ratio</h4>
              <p className="text-xs text-[#475569] leading-relaxed">
                Prevents teachers from giving personalized feedback.
              </p>
            </div>

            <div className="card p-6 bg-white border-slate-200 text-center space-y-2">
              <p className="text-4xl font-extrabold text-teal-700">2+ Hrs</p>
              <h4 className="font-bold text-sm text-[#0F172A]">Manual Grading</h4>
              <p className="text-xs text-[#475569] leading-relaxed">
                Lost daily on repetitive marking without analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: How It Works ─────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white border-t border-b border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto space-y-12 max-w-5xl">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold text-[#0F766E] uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full">
              Pedagogy
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-[#0F172A]">How It Works</h2>
            <p className="text-sm font-semibold text-[#475569]">Four simple steps built directly into your workflow</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { n: 1, icon: Camera, title: "Capture", desc: "Snap a photo of the student's handwritten notebook page.", color: "#3b82f6" },
              { n: 2, icon: FileText, title: "Extract", desc: "Intelligent OCR digitizes mathematical numerals with high precision.", color: "#6366f1" },
              { n: 3, icon: Brain, title: "Analyze", desc: "AI flags subtraction borrowing errors and place value system slips.", color: "#8b5cf6" },
              { n: 4, icon: Lightbulb, title: "Recommend", desc: "Pedagogical tips and target remedial drills loaded instantly.", color: "#10b981" },
            ].map((step) => {
              const IconComponent = step.icon;
              return (
                <div key={step.n} className="card p-6 flex flex-col items-start text-left space-y-4 border-slate-200 bg-[#F8FAFC]/50">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                    style={{ background: `${step.color}12`, color: step.color }}
                  >
                    <IconComponent size={20} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-bold text-base leading-tight text-[#0F172A]">
                      {step.n}. {step.title}
                    </p>
                    <p className="text-xs leading-relaxed text-[#475569] font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 4: AI Diagnosis Demo ─────────────────────────────────── */}
      <section className="py-20 px-6 max-w-7xl mx-auto relative z-10 max-w-5xl">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-extrabold text-[#0F766E] uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full">
            AI Diagnosis Demo
          </span>
          <h2 className="text-3xl font-extrabold font-heading text-[#0F172A]">Conceptual Intelligence in Action</h2>
          <p className="text-sm font-semibold text-[#475569]">Observe how Kagaz AI detects underlying student gaps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Before */}
          <div className="card p-8 border-rose-100 bg-[#ffffff] space-y-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
            <h3 className="text-xs font-extrabold text-rose-600 uppercase tracking-wider">Before (Standard Assessment)</h3>
            <p className="text-lg font-bold text-[#0F172A]">Wrong Answer</p>
            <div className="p-4 rounded-xl bg-slate-50 font-mono text-xs border border-slate-200">
              <p className="text-[#475569]">Math Problem: 52 - 18</p>
              <p className="text-rose-600 mt-2 font-bold">Student Answer: 44 (Incorrect)</p>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed font-semibold">
              The teacher only knows the student got the answer wrong, but has no insight into the mathematical misconception.
            </p>
          </div>

          {/* After */}
          <div className="card p-8 border-teal-200 bg-[#ffffff] space-y-4 relative overflow-hidden shadow-md">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-600" />
            <h3 className="text-xs font-extrabold text-teal-600 uppercase tracking-wider">After (Kagaz AI Diagnosis)</h3>
            <p className="text-lg font-bold text-[#0F172A]">Place Value Confusion</p>
            <div className="p-4 rounded-xl bg-teal-50/40 font-mono text-xs border border-teal-100 space-y-1">
              <p className="text-teal-950"><span className="font-bold">Detected Misconception:</span> Subtraction borrowing from top-down</p>
              <p className="text-teal-900"><span className="font-bold">Confidence:</span> 92%</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recommended Activity</p>
              <p className="text-xs font-bold text-slate-800 mt-1">Number Line Activity with Place-Value Counters</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Screenshots ─────────────────────────────────────── */}
      <section id="screenshots-section" className="py-20 px-6 bg-slate-50 border-t border-b border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto space-y-10 max-w-5xl">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
              Live Screenshots
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-[#0F172A]">Explore the Dashboard</h2>
            <p className="text-sm font-semibold text-[#475569]">A transparent side-by-side preview of the application workspace</p>
          </div>

          {/* Selector Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-200/60 p-1 rounded-2xl flex gap-1 border border-slate-300/40">
              {[
                { id: "upload", label: "1. Upload" },
                { id: "verify", label: "2. Verification" },
                { id: "dashboard", label: "3. Dashboard" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setPreviewTab(t.id)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${previewTab === t.id ? "bg-white text-teal-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mock Browser Wrapper */}
          <div className="card bg-white border-slate-200 shadow-2xl rounded-2xl overflow-hidden max-w-4xl mx-auto">
            <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-[10px] text-slate-400 font-bold font-mono">app.kagaz.ai</span>
              <span className="w-6" />
            </div>

            <div className="p-8 min-h-[300px] flex items-center justify-center">
              {previewTab === "upload" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full animate-fade-in">
                  <div className="space-y-4">
                    <h3 className="text-lg font-extrabold text-[#0F172A]">Batch Upload Interface</h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Upload multiple worksheet scans at once. Our pipeline queue queues them locally via IndexedDB and handles backgrounds uploads automatically once online.
                    </p>
                    <ul className="text-xs font-bold text-slate-600 space-y-1">
                      <li>✓ Drag & drop notebook images</li>
                      <li>✓ Low file-size optimization</li>
                      <li>✓ Supports offline capture queuing</li>
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center py-10">
                    <Upload className="text-[#0F766E] mb-2" size={32} />
                    <p className="text-xs font-bold text-slate-600">Select Files to Upload</p>
                    <p className="text-[10px] text-slate-400 mt-1">Supports JPG, PNG up to 5MB</p>
                  </div>
                </div>
              )}

              {previewTab === "verify" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full animate-fade-in">
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="text-lg font-extrabold text-[#0F172A]">Teacher Verification Screen</h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Maintains absolute teacher control. Check OCR answers side-by-side with original scanned images.
                    </p>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 text-center font-mono text-xs">
                    <p className="text-slate-400 mb-2">Original Scanned Sheet</p>
                    <p className="text-2xl font-bold font-serif my-4">52 - 18 = 44</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Extracted Answer</label>
                      <input type="text" readOnly value="44" className="input input-sm font-bold border-teal-200" />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm flex-1 font-bold text-xs" style={{ minHeight: 38 }}>Edit</button>
                      <button className="btn btn-primary btn-sm flex-1 font-bold text-xs" style={{ minHeight: 38 }}>Approve</button>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === "dashboard" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full animate-fade-in">
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="text-lg font-extrabold text-[#0F172A]">Insights Dashboard</h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Visualize student performance with custom subject donut charts and recurring conceptual weak-point lists.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-800">Subject Distribution</p>
                    <div className="w-20 h-20 rounded-full border-8 border-teal-700 flex items-center justify-center mx-auto text-xs font-bold text-slate-800">Math</div>
                    <div className="flex justify-around text-[10px] text-slate-500 font-bold mt-2">
                      <span>Math (42%)</span>
                      <span>Reading (35%)</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-orange-200 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                    <p className="text-xs font-bold text-slate-800">⚠ Subtraction Borrowing</p>
                    <p className="text-xs text-slate-500 mt-2 font-semibold">Affected: 72% | Confidence: 91%</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">Rec: Number Line Activity</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Impact ───────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-7xl mx-auto relative z-10 max-w-5xl">
        <div className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-extrabold text-[#0F766E] uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full">
              Impact
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-[#0F172A]">Designed for India's Educational Realities</h2>
            <p className="text-sm font-semibold text-[#475569]">Engineered to work reliably across rural government schools</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card p-6 bg-white border-slate-200 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">
                <Clock size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-[#0F172A]">90% Faster Grading</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Transform a 2-hour stack grading hurdle into a 10-minute automated photo sync. Reclaim hours of classroom prep time.
                </p>
              </div>
            </div>

            <div className="card p-6 bg-white border-slate-200 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">
                <Wifi size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-[#0F172A]">Offline Ready</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Queue captured sheets offline via IndexedDB. Your roster syncs automatically once an active connection is detected.
                </p>
              </div>
            </div>

            <div className="card p-6 bg-white border-slate-200 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">
                <FileImage size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-[#0F172A]">Supports Handwritten Worksheets</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Advanced OCR models adapt to real student pencil writing, local numerical scripts, and standard notebook lighting.
                </p>
              </div>
            </div>

            <div className="card p-6 bg-white border-slate-200 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">
                <Globe size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-[#0F172A]">Multilingual</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Switch instantly between Hindi and English languages to accommodate varying teacher preferences and regions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: CTA ──────────────────────────────────────────────── */}
      <section
        className="py-20 px-6 text-white relative z-10"
        style={{ 
          background: "linear-gradient(135deg, #0F766E 0%, #115e59 100%)",
          borderTop: "1.5px solid rgba(255,255,255,0.1)" 
        }}
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading">
            Start Grading Smarter
          </h2>
          <p className="text-teal-100 max-w-lg mx-auto leading-relaxed text-sm font-medium">
            Join schools across India who are reclaiming teaching time and identifying learning gaps in real time.
          </p>
          <div>
            <Link
              href="/signup"
              className="btn btn-primary btn-lg bg-white text-teal-900 font-bold hover:bg-teal-50 shadow-xl cursor-pointer"
              style={{ background: "#ffffff", color: "#0F766E", border: "none" }}
            >
              Start Grading Smarter
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="py-10 px-6 text-sm"
        style={{ 
          background: "rgba(255,255,255,0.5)", 
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderTop: "1.5px solid var(--border)", 
          color: "var(--text-3)" 
        }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-extrabold text-primary">{t("appName")}</span>
          <span className="text-sm text-center">{t("footerText")}</span>
          <Link href="/login" className="font-semibold text-primary flex items-center gap-1">
            <span>{t("logIn")} →</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
