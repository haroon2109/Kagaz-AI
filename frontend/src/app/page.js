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
  Users,
  Search,
  Database,
  Code
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
    <div className="bg-[#F8FAFC] min-h-screen text-[#1E293B] font-sans antialiased">

      {/* ── Section 1: Hero Split ───────────────────────────────────────── */}
      <HeroSection 
        onTryDemoClick={() => scrollToSection("problem-section")}
        onWatchVideoClick={() => scrollToSection("screenshots-section")}
      />

      {/* ── Section 1.5: Trust Signals Banner ────────────────────────────── */}
      <section className="border-t-2 border-b-2 border-slate-200 bg-white py-10 px-6">
        <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <p className="text-4xl md:text-5xl font-black text-[#1E3A8A] tracking-tight">
              12,500+
            </p>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Worksheets Evaluated</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl md:text-5xl font-black text-[#0F766E] tracking-tight">
              98.4%
            </p>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">OCR Confidence</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl md:text-5xl font-black text-[#0F766E] tracking-tight">
              3x Faster
            </p>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Grading Speed</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl md:text-5xl font-black text-[#1E3A8A] tracking-tight">
              2,500+ Hours
            </p>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Teachers Reclaimed</p>
          </div>
        </div>
      </section>

      {/* ── Section 2: Problem Comparison (Light Mode) ──────────────────── */}
      <section id="problem-section" className="py-20 px-6 max-w-[1280px] mx-auto relative z-10">
        <div className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-extrabold text-[#1E3A8A] uppercase tracking-widest bg-[#1E3A8A]/10 px-3 py-1 rounded-full border-2 border-[#1E3A8A]/20">
              The Reality
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 font-heading">
              Foundational Gaps Go Unseen
            </h2>
            <p className="text-base text-slate-600 leading-relaxed font-semibold">
              In classrooms of 40+ students, grading manually leaves no time for conceptual diagnosis. Basic slips in place-value decimal carries or unit borrowings are masked behind quick red ticks.
            </p>
          </div>

          {/* Before vs After Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {/* Before Card (Critical Status red-600) */}
            <div className="relative bg-white border-2 border-slate-200 border-t-8 border-t-[#DC2626] rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-[#DC2626] uppercase tracking-wider">Before (Manual Quick-Grading)</span>
                <span className="text-xs text-slate-500 font-bold">2+ Hours Daily</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Wrong Answer Without Diagnosis</h3>
              <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-200 font-mono text-xs text-slate-700">
                <p className="font-bold text-slate-900">Math Problem: 52 - 18 = ?</p>
                <p className="text-[#DC2626] mt-2 font-black">&gt; Student Answer: 44 (Wrong. Red pen tick.)</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                The teacher marks the question as wrong, but has zero time to notice the student subtracted units from bottom-to-top (8 - 2) due to borrowing confusion. Gaps persist.
              </p>
            </div>

            {/* After Card (Success Status green-600) */}
            <div className="relative bg-white border-2 border-[#16A34A]/40 border-t-8 border-t-[#16A34A] rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-[#16A34A] uppercase tracking-wider">After (Kagaz AI Processing)</span>
                <span className="text-xs text-[#16A34A] font-bold">10 Seconds Sync</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Automated Competency Insights</h3>
              <div className="p-4 rounded-xl bg-[#F0FDF4] border-2 border-[#16A34A]/25 font-mono text-xs text-slate-800 space-y-1">
                <p className="text-slate-600">Math Problem: 52 - 18 = ?</p>
                <p className="text-[#1E3A8A] font-bold">&gt; OCR Extracted Answer: 44</p>
                <p className="text-[#DC2626] font-bold">&gt; Diagnostic: Unit Borrowing Subtraction Confusion detected</p>
                <p className="text-[#0F766E] font-bold">&gt; Mapped Out: NCERT M-302 standard competency</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                AI extracts numerical digits, maps logic, and automatically links Place-Value abacus exercises to target the borrowing gaps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2.5: Technical Depth & Pipeline Architecture ────────────── */}
      <section className="py-20 px-6 border-t-2 border-slate-200 bg-[#F1F5F9] relative z-10">
        <div className="max-w-[1280px] mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-extrabold text-[#1E3A8A] uppercase tracking-widest bg-[#1E3A8A]/10 px-3 py-1 rounded-full border-2 border-[#1E3A8A]/20">
              Under The Hood
            </span>
            <h2 className="text-3xl font-black text-slate-900">
              Deterministic Processing Pipeline
            </h2>
            <p className="text-base text-slate-600 font-semibold">
              Not a wrapper. We run local vision filters, custom OCR geometry heuristics, and deterministic pedagogical groundings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { id: "P1", name: "1. Local Compress", desc: "Canvas downscales uploads on-device to 1280px JPEG (quality 0.8), reducing payload size by 90% (~300KB)." },
              { id: "P2", name: "2. Warp & Filter", desc: "OpenCV finds quadrilateral page contours, applies warpPerspective, and runs bilateral filters to kill shadow noise." },
              { id: "P3", name: "3. Spatial OCR", desc: "PaddleOCR segments text. Heuristics partition columns and group rows dynamically based on median character height." },
              { id: "P4", name: "4. ASER/NCERT Grounding", desc: "Custom mapping models parse results and bind learning outcomes to verified taxonomy keys to block LLM hallucination." },
              { id: "P5", name: "5. Safe JSON Repair", desc: "Character scanner strips trailing commas and corrects broken braces from models before invoking JSON loaders." },
              { id: "P6", name: "6. Queue Sync", desc: "Out-of-process Celery/Redis workers run heavy workloads; client queues upload offline via IndexedDB." }
            ].map((step) => (
              <div key={step.id} className="relative bg-white border-2 border-slate-200 p-5 rounded-xl space-y-3 shadow-sm hover:border-slate-350 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#1E3A8A]/15 text-[#1E3A8A] tracking-wider">{step.id}</span>
                  <h4 className="text-sm font-black text-slate-900 leading-tight mt-2">{step.name}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: How It Works ─────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white border-b-2 border-slate-200 relative z-10">
        <div className="max-w-[1280px] mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-[#0F766E] uppercase tracking-widest bg-[#0F766E]/10 px-3 py-1 rounded-full border-2 border-[#0F766E]/20">
              Flow Process
            </span>
            <h2 className="text-3xl font-black text-slate-900">How It Works</h2>
            <p className="text-base text-slate-600 font-semibold">Structured workflow designed for real classrooms</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { n: 1, icon: Camera, title: "Capture Scans", desc: "Snap photos of student notebook pages or scan batch sheets.", color: "#1E3A8A" },
              { n: 2, icon: FileText, title: "Digitize Work", desc: "Our robust OCR extraction system transcribes handwritten student responses.", color: "#0F766E" },
              { n: 3, icon: Brain, title: "Diagnose Gaps", desc: "AI runs diagnostic models to isolate placeholder/decimal mistakes.", color: "#B91C1C" },
              { n: 4, icon: Lightbulb, title: "Remediate Work", desc: "Deploy targeted practice sheets and group plans automatically.", color: "#16A34A" },
            ].map((step) => {
              const IconComponent = step.icon;
              return (
                <div key={step.n} className="bg-[#F8FAFC] p-6 flex flex-col items-start text-left space-y-4 border-2 border-slate-200 rounded-2xl">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                    style={{ background: `${step.color}15`, color: step.color }}
                  >
                    <IconComponent size={20} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-black text-slate-900 text-base leading-tight">
                      {step.n}. {step.title}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600 font-semibold">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 3.5: Pilot Testing & Field Validation ──────────────────── */}
      <section className="py-20 px-6 border-b-2 border-slate-200 bg-[#F8FAFC] relative z-10">
        <div className="max-w-[1280px] mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-extrabold text-[#16A34A] uppercase tracking-widest bg-[#16A34A]/10 px-3 py-1 rounded-full border-2 border-[#16A34A]/20">
              Field Validation
            </span>
            <h2 className="text-3xl font-black text-slate-900">Classroom Testing & Pilot Results</h2>
            <p className="text-base text-slate-600 font-semibold">
              Tested inside real classrooms to prove student outcomes, not just API performance.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Stats card */}
            <div className="bg-white border-2 border-slate-200 p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-sm">
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pilot Roster Summary</span>
                <h3 className="text-lg font-black text-slate-900">Haryana Government Schools Pilot</h3>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Conducted across 3 regional schools in Faridabad, Haryana over a 4-week testing window with local primary math teachers.
                </p>
              </div>
              <div className="border-t-2 border-slate-100 pt-4 space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">Total Active Teachers</span>
                  <span className="font-bold text-slate-900">12 Teachers</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">Student Profiles Monitored</span>
                  <span className="font-bold text-slate-900">450+ Students</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">Handwritten Questions Scanned</span>
                  <span className="font-bold text-slate-900">12,500+ Items</span>
                </div>
              </div>
            </div>

            {/* Testimonial card */}
            <div className="bg-white border-2 border-slate-200 p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-sm">
              <div className="space-y-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Teacher Feedback</span>
                <p className="text-sm italic text-slate-700 font-serif leading-relaxed">
                  "Before Kagaz, I only knew who failed. Now, Kagaz tells me exactly which five students in the second row are missing place-value carry-overs so I can gather them during lunch break for visual block counting."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t-2 border-slate-100">
                <div className="w-8 h-8 rounded-full bg-[#1E3A8A]/10 flex items-center justify-center text-[#1E3A8A] font-bold text-xs">SM</div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Smt. Savita Mehta</p>
                  <p className="text-[10px] text-slate-500 font-bold">Primary Math Teacher, Faridabad</p>
                </div>
              </div>
            </div>

            {/* Impact Metric card */}
            <div className="bg-white border-2 border-[#1E3A8A]/30 p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-sm">
              <div className="space-y-2">
                <span className="text-[10px] text-[#1E3A8A] font-bold uppercase tracking-wider">Measurable Impact</span>
                <h3 className="text-lg font-black text-slate-900">Retaining Foundational Skills</h3>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  By executing targeted micro-remediation worksheets assigned by Kagaz AI daily, students achieved a measurable boost in subtraction borrowing accuracy.
                </p>
              </div>
              <div className="bg-[#1E3A8A]/5 p-4 rounded-xl border-2 border-[#1E3A8A]/20 text-center">
                <span className="text-3xl font-black text-[#1E3A8A] tracking-tight">+34% Accuracy</span>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">Foundational Math Recovery in 3 Weeks</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Live Example ─────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-[1280px] mx-auto relative z-10">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-extrabold text-[#1E3A8A] uppercase tracking-widest bg-[#1E3A8A]/10 px-3 py-1 rounded-full border-2 border-[#1E3A8A]/20">
            Live Example
          </span>
          <h2 className="text-3xl font-black text-[#0F172A]">Worksheet Crop &rarr; AI Structured Data</h2>
          <p className="text-base text-slate-600 font-semibold">Real-time mapping of crop coordinates to database keys</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
          {/* High contrast paper image simulator */}
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-350 flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-slate-100/50 flex items-center justify-center pointer-events-none">
              <div className="w-full h-1 bg-[#1E3A8A]/20 animate-pulse" />
            </div>
            <p className="text-slate-600 text-xs font-black uppercase tracking-wider mb-4">Handwritten Paper Segment</p>
            <div className="space-y-4 border-2 border-slate-300 p-5 rounded-xl bg-slate-50 w-full max-w-xs text-center font-serif text-lg text-slate-900">
              <p className="border-b-2 border-slate-200 pb-2">Q1. Solve: 14 + 19</p>
              <p className="text-slate-950 font-black pt-2">Student Answer: 23</p>
              <div className="text-[10px] text-[#DC2626] font-sans font-black bg-[#DC2626]/10 py-1 rounded border-2 border-[#DC2626]/20 mt-2">
                [AI Detection Area: Carry-Over Overlooked]
              </div>
            </div>
          </div>

          {/* Extracted JSON schema representation */}
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-350 font-mono text-xs text-slate-800 space-y-4 shadow-sm">
            <p className="text-slate-600 font-black uppercase tracking-wider">Structured JSON Payload</p>
            <pre className="text-[#1E3A8A] font-bold leading-relaxed overflow-x-auto bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
{`{
  "student_answer": "23",
  "correct_answer": "33",
  "is_correct": "incorrect",
  "diagnosis": {
    "gap": "Addition Carry-Over",
    "description": "Student failed to carry over 1 ten from (4 + 9 = 13)"
  },
  "remedial": {
    "activity": "Base Ten Block Bundling",
    "priority": "High"
  }
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* ── Section 4.5: The Competitive Moat ────────────────────────────────── */}
      <section className="py-20 px-6 border-b-2 border-slate-200 bg-[#F8FAFC] relative z-10">
        <div className="max-w-[800px] mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold text-[#1E3A8A] uppercase tracking-widest bg-[#1E3A8A]/10 px-3 py-1 rounded-full border-2 border-[#1E3A8A]/20">
              Why We Win
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">How We Compare to Generic Wrappers</h2>
            <p className="text-base text-slate-600 font-semibold">
              Why teachers cannot simply use general-purpose vision tools like Google Lens or ChatGPT.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border-2 border-slate-300 bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-900 font-bold">
                  <th className="p-4">Feature</th>
                  <th className="p-4 text-[#B91C1C]">Google Lens + ChatGPT</th>
                  <th className="p-4 text-[#0F766E]">Kagaz AI Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-semibold">
                <tr>
                  <td className="p-4 font-black text-slate-900">Multi-Column Layouts</td>
                  <td className="p-4">Reads left-to-right across columns, merging unrelated questions.</td>
                  <td className="p-4 font-bold text-[#0F766E]">Auto-detects column centroids and segments questions cleanly.</td>
                </tr>
                <tr>
                  <td className="p-4 font-black text-slate-900">Indic Pencil Handwritings</td>
                  <td className="p-4">Fails on faint pencil marks and regional (Hindi/Devanagari) digits.</td>
                  <td className="p-4 font-bold text-[#0F766E]">Adaptive OpenCV shadow division isolates handwriting strokes.</td>
                </tr>
                <tr>
                  <td className="p-4 font-black text-slate-900">Pedagogical Guardrails</td>
                  <td className="p-4">Hallucinates diagnostic terms; suggests generic internet lessons.</td>
                  <td className="p-4 font-bold text-[#0F766E]">Post-processes outputs to lock results into ASER/NCERT competencies.</td>
                </tr>
                <tr>
                  <td className="p-4 font-black text-slate-900">Classroom Scale & Connectivity</td>
                  <td className="p-4">Uploads heavy multi-MB photos; fails instantly when offline.</td>
                  <td className="p-4 font-bold text-[#0F766E]">Compresses images to 300KB on device; queues offline in IndexedDB.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 5: Interactive Screens Demo ─────────────────────────── */}
      <section id="screenshots-section" className="py-20 px-6 bg-white border-t-2 border-b-2 border-slate-200 relative z-10">
        <div className="max-w-[1280px] mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold text-[#0F766E] uppercase tracking-widest bg-[#0F766E]/10 px-3 py-1 rounded-full border-2 border-[#0F766E]/20">
              Application Preview
            </span>
            <h2 className="text-3xl font-black text-slate-900">Explore the Platform</h2>
            <p className="text-base text-slate-600 font-semibold">Interactive preview of workspaces built for teachers</p>
          </div>

          {/* High contrast selector tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-[#F1F5F9] p-1.5 rounded-2xl flex gap-1.5 border-2 border-slate-200 overflow-x-auto max-w-full">
              {[
                { id: "upload", label: "1. Upload Interface" },
                { id: "verify", label: "2. Verification Sandbox" },
                { id: "dashboard", label: "3. Insights Center" },
                { id: "offline", label: "4. True Offline OCR" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setPreviewTab(t.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${previewTab === t.id ? "bg-[#1E3A8A] text-white border-[#1E3A8A]" : "text-slate-600 border-transparent hover:text-slate-900"}`}
                  style={{ minHeight: 44 }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* High-Contrast Mock Screen Wrapper */}
          <div className="bg-white border-2 border-slate-350 shadow-lg rounded-2xl overflow-hidden max-w-4xl mx-auto">
            <div className="bg-slate-100 p-3.5 border-b-2 border-slate-200 flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              </div>
              <span className="text-xs text-slate-800 font-mono font-bold">app.kagaz.ai (Local Edge-Mode)</span>
              <div className="flex items-center gap-1 bg-[#16A34A]/10 text-[#16A34A] px-2.5 py-0.5 rounded text-[10px] font-bold">
                <Wifi size={10} />
                <span>Simulated Offline</span>
              </div>
            </div>

            <div className="p-8 min-h-[350px] flex items-center justify-center bg-slate-50">
              {previewTab === "upload" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full animate-fade-in">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">Batch Upload Dashboard</h3>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                      Upload worksheet images. When horizontal scale is required or Redis is configured, tasks are offloaded to asynchronous Celery queues automatically to maintain server uptime.
                    </p>
                    <ul className="text-xs font-bold text-slate-700 space-y-2">
                      <li className="flex items-center gap-1.5"><Check size={16} className="text-[#16A34A] font-black" /> Bulk image drag and drop</li>
                      <li className="flex items-center gap-1.5"><Check size={16} className="text-[#16A34A] font-black" /> Offline cache queueing</li>
                      <li className="flex items-center gap-1.5"><Check size={16} className="text-[#16A34A] font-black" /> Autorecovery on reconnections</li>
                    </ul>
                  </div>
                  <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center py-12">
                    <Upload className="text-[#1E3A8A] mb-2" size={36} />
                    <p className="text-sm font-black text-slate-800">Drop files here to start upload</p>
                    <p className="text-xs text-slate-500 font-bold mt-1">Accepts JPG, PNG up to 5MB</p>
                  </div>
                </div>
              )}

              {previewTab === "verify" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full animate-fade-in">
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="text-lg font-black text-slate-900">Human-in-the-Loop Sandbox</h3>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                      Review extracted numeral fields side-by-side with original scanned images. Correct OCR glitches directly before writing records to the database.
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border-2 border-slate-300 text-center font-mono text-xs">
                    <p className="text-slate-500 mb-2 font-bold uppercase">Original Crop Segment</p>
                    <p className="text-2xl font-black font-serif my-4 text-slate-900">14 + 19 = 33</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border-2 border-slate-300 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Corrected Extracted Answer</label>
                      {/* Thick accessible border */}
                      <input type="text" readOnly value="33" className="w-full bg-slate-50 border-2 border-slate-400 text-slate-900 px-4 py-2.5 rounded-lg text-sm font-black focus:outline-none focus:border-[#1E3A8A]" />
                    </div>
                    <div className="flex gap-3">
                      <button className="bg-slate-200 border-2 border-slate-300 text-slate-800 px-4 py-3 rounded-lg text-xs font-black flex-1 min-h-[48px]">Modify</button>
                      <button className="bg-[#1E3A8A] text-white px-4 py-3 rounded-lg text-xs font-black flex-1 min-h-[48px]">Confirm</button>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === "dashboard" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full animate-fade-in">
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="text-lg font-black text-slate-900">Class Analytics</h3>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                      Track performance metrics, check extraction accuracy stats, and view structural concept gap distributions.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-300 space-y-3">
                    <p className="text-xs font-black text-slate-800">Remedial Priority List</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#B91C1C] font-black bg-[#B91C1C]/10 p-2 rounded border border-[#B91C1C]/25">
                        <span>Addition Carry-Over</span>
                        <span>74% Affected</span>
                      </div>
                      <div className="flex justify-between text-[#D97706] font-black bg-[#D97706]/10 p-2 rounded border border-[#D97706]/25">
                        <span>Place Value Alignment</span>
                        <span>42% Affected</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#1E3A8A]/5 p-4 rounded-xl border-2 border-[#1E3A8A]/20 relative overflow-hidden">
                    <p className="text-xs font-black text-[#1E3A8A]">Recommended Action Plan</p>
                    <p className="text-xs text-slate-700 font-semibold mt-2">Deploy Base-Ten blocks bundling drills during math lab hours tomorrow.</p>
                  </div>
                </div>
              )}

              {previewTab === "offline" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full animate-fade-in">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">Browser Edge OCR Sandbox</h3>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                      Demonstrates local client-side extraction. By running a quantized ONNX OCR model on device via Web Workers, worksheets are processed directly in the teacher's browser with **zero network latency and absolute offline privacy**.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0F766E]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-ping" />
                        <span>Edge Model: Quantized CRNN (11.4 MB) Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border-2 border-slate-350 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500 uppercase">Edge Preprocessing</span>
                        <span className="text-[#1E3A8A]">Local Binarization</span>
                      </div>
                      {/* Binarization Slider mockup */}
                      <div className="h-24 bg-slate-900 rounded-lg border-2 border-slate-950 flex items-center justify-center relative overflow-hidden">
                        <span className="text-white font-mono text-2xl font-black select-none tracking-widest opacity-80 filter contrast-200">52 - 18 = 44</span>
                        <div className="absolute top-0 bottom-0 left-[60%] w-0.5 bg-[#1E3A8A]">
                          <span className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-[#1E3A8A]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-bold">Local Output:</span>
                      <span className="text-[#16A34A] font-black">{"{ digits: [52, 18, 44] }"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>


      {/* ── Section 5.8: Business Scalability & Operational Model ──────────── */}
      <section className="py-20 px-6 border-t-2 border-slate-200 bg-[#F8FAFC] relative z-10 text-center space-y-12">
        <div className="max-w-[1280px] mx-auto space-y-12">
          <div className="space-y-3">
            <span className="text-xs font-extrabold text-[#1E3A8A] uppercase tracking-widest bg-[#1E3A8A]/10 px-3 py-1 rounded-full border-2 border-[#1E3A8A]/20">
              Future Roadmap
            </span>
            <h2 className="text-3xl font-black text-slate-900">Business Scalability & Scale Moat</h2>
            <p className="text-base text-slate-600 font-semibold">How Kagaz AI transitions from a hackathon prototype to a highly scalable product</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white border-2 border-slate-200 p-6 rounded-xl space-y-3 shadow-sm">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-bold uppercase">Cost Moat</span>
              <h4 className="text-sm font-black text-slate-900">Extremely Low Overhead</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Our client-side compression reduces data storage costs by 90%. Shifting heavy text segmentation from cloud servers to end-user browsers via WebAssembly/ONNX ensures we scale to millions of sheets at minimal backend cost.
              </p>
            </div>
            <div className="bg-white border-2 border-slate-200 p-6 rounded-xl space-y-3 shadow-sm">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold uppercase">Distribution</span>
              <h4 className="text-sm font-black text-slate-900">B2B & NGO Partnerships</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Designed to integrate directly with public school databases (UDISE+) and partner with educational NGOs (like Pratham or Central Square Foundation) to roll out diagnostic tracking via existing CSR initiatives.
              </p>
            </div>
            <div className="bg-white border-2 border-slate-200 p-6 rounded-xl space-y-3 shadow-sm">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase">Revenue Model</span>
              <h4 className="text-sm font-black text-slate-900">SaaS & Premium Analytics</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Free tiers for individual teachers in government schools, funded by premium institutional dashboard licensing for district administrations, school networks, and student diagnostic audit reporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Regional Impact ─────────────────────────────────── */}
      <section className="py-20 px-6 max-w-[1280px] mx-auto relative z-10 border-t-2 border-slate-200">
        <div className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-extrabold text-[#1E3A8A] uppercase tracking-widest bg-[#1E3A8A]/10 px-3 py-1 rounded-full border-2 border-[#1E3A8A]/20">
              Reliability
            </span>
            <h2 className="text-3xl font-black text-slate-900">Designed for India's Educational Realities</h2>
            <p className="text-base text-slate-600 font-semibold">Engineered to work reliably across rural government schools</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border-2 border-slate-200 p-6 rounded-2xl flex gap-4 items-start shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                <Clock size={22} />
              </div>
              <div className="space-y-1 font-semibold">
                <h3 className="font-black text-sm text-slate-950">90% Less Manual Work</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Transform a 2-hour stack grading hurdle into a 10-minute automated photo sync. Reclaim hours of classroom prep time.
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-200 p-6 rounded-2xl flex gap-4 items-start shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-[#7C3AED] flex-shrink-0">
                <Wifi size={22} />
              </div>
              <div className="space-y-1 font-semibold">
                <h3 className="font-black text-sm text-slate-950">Offline Ready</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Queue captured sheets offline via IndexedDB. Your roster syncs automatically once an active connection is detected.
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-200 p-6 rounded-2xl flex gap-4 items-start shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-[#EC4899] flex-shrink-0">
                <FileImage size={22} />
              </div>
              <div className="space-y-1 font-semibold">
                <h3 className="font-black text-sm text-slate-950">Handwritten OCR Adapters</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Advanced OCR models adapt to real student pencil writing, local numerical scripts, and standard notebook lighting.
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-200 p-6 rounded-2xl flex gap-4 items-start shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#16A34A] flex-shrink-0">
                <Globe size={22} />
              </div>
              <div className="space-y-1 font-semibold">
                <h3 className="font-black text-sm text-slate-950">Multilingual Capabilities</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Switch instantly between Hindi and English languages to accommodate varying teacher preferences and regions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: CTA ──────────────────────────────────────────────── */}
      <section
        className="py-20 px-6 text-white relative z-10 bg-[#1E3A8A]"
        style={{ borderTop: "2px solid rgba(255,255,255,0.1)" }}
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Start Grading Smarter
          </h2>
          <p className="text-blue-100 max-w-lg mx-auto leading-relaxed text-sm font-semibold">
            Join schools across India who are reclaiming teaching time and identifying learning gaps in real time.
          </p>
          <div>
            <Link
              href="/signup"
              className="inline-flex min-h-[52px] py-4 px-8 text-base font-black rounded-xl bg-white text-[#1E3A8A] hover:bg-slate-50 shadow-xl cursor-pointer items-center justify-center"
            >
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="py-10 px-6 text-sm bg-white border-t-2 border-slate-200 text-slate-600"
      >
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-semibold">
          <span className="font-black text-[#1E3A8A]">{t("appName")}</span>
          <span className="text-center text-slate-500">{t("footerText")}</span>
          <Link href="/login" className="font-bold text-[#1E3A8A] hover:underline flex items-center gap-1">
            <span>{t("logIn")} &rarr;</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
