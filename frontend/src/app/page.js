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
    <div className="bg-[#0A0A0A] min-h-screen text-slate-300 font-sans antialiased">

      {/* ── Section 1: Hero Split ───────────────────────────────────────── */}
      <HeroSection 
        onTryDemoClick={() => scrollToSection("problem-section")}
        onWatchVideoClick={() => scrollToSection("screenshots-section")}
      />

      {/* ── Section 1.5: Trust Signals Banner ────────────────────────────── */}
      <section className="border-t border-b border-slate-900 bg-slate-950/40 py-12 px-6">
        <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <p className="text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
              10,000+
            </p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Worksheets Graded</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              95%
            </p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">OCR Accuracy</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              3x Faster
            </p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Grading Workflow</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              2,500+
            </p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hours Reclaimed</p>
          </div>
        </div>
      </section>

      {/* ── Section 2: Problem Comparison ────────────────────────────────── */}
      <section id="problem-section" className="py-32 px-6 max-w-[1280px] mx-auto relative z-10">
        <div className="space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              The Reality
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white font-heading">
              Foundational Gaps Go Unseen
            </h2>
            <p className="text-base text-slate-400 leading-relaxed font-medium">
              In classrooms of 40+ students, grading manually leaves no time for conceptual diagnosis. Basic slips in decimal carry-overs or borrowings are masked behind simple red ticks.
            </p>
          </div>

          {/* Before vs After Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Before Card */}
            <div className="relative bg-slate-950/40 border border-slate-900 rounded-2xl p-6 space-y-4 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500/40" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-rose-500 uppercase tracking-wider">Before (Manual Tick-Marking)</span>
                <span className="text-[10px] text-slate-600 font-bold">2+ Hours Daily</span>
              </div>
              <h3 className="text-lg font-bold text-white">Wrong Answer Without Diagnosis</h3>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 font-mono text-xs text-slate-400">
                <p>Math Problem: 52 - 18 = ?</p>
                <p className="text-rose-500 mt-2 font-bold">&gt; Student Answer: 44 (Wrong. Red pen tick.)</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                The teacher marks the question as wrong, but has zero time to notice the student subtracted units from bottom-to-top (8 - 2) due to borrowing confusion. Gaps persist.
              </p>
            </div>

            {/* After Card */}
            <div className="relative bg-slate-950/60 border border-blue-500/20 rounded-2xl p-6 space-y-4 overflow-hidden shadow-xl shadow-blue-950/10">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500/60" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">After (Kagaz AI Processing)</span>
                <span className="text-[10px] text-[#22C55E] font-bold">10 Seconds Sync</span>
              </div>
              <h3 className="text-lg font-bold text-white">Automated Conceptual Insights</h3>
              <div className="p-4 rounded-xl bg-blue-950/10 border border-blue-900/30 font-mono text-xs text-slate-300 space-y-1">
                <p className="text-slate-400">Math Problem: 52 - 18 = ?</p>
                <p className="text-emerald-400 font-bold">&gt; OCR Extracted Answer: 44</p>
                <p className="text-purple-400 font-bold">&gt; Diagnostic: Unit Borrowing Subtraction Confusion detected</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                AI extracts numerical digits, maps logic, and automatically links Place-Value number line activities to target the Borrowing Gaps dynamically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: How It Works ─────────────────────────────────────── */}
      <section className="py-32 px-6 bg-slate-950/20 border-t border-b border-slate-900 relative z-10">
        <div className="max-w-[1280px] mx-auto space-y-16">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Flow Process
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">How It Works</h2>
            <p className="text-sm text-slate-500">Structured workflow designed for real classrooms</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { n: 1, icon: Camera, title: "Capture Scans", desc: "Snap photos of student notebook pages or scan batch sheets.", color: "#2563EB" },
              { n: 2, icon: FileText, title: "Digitize Work", desc: "Our robust OCR extraction system transcribes handwritten student responses.", color: "#7C3AED" },
              { n: 3, icon: Brain, title: "Diagnose Gaps", desc: "AI runs diagnostic models to isolate placeholder/decimal mistakes.", color: "#EC4899" },
              { n: 4, icon: Lightbulb, title: "Remediate Work", desc: "Deploy targeted practice sheets and group plans automatically.", color: "#22C55E" },
            ].map((step) => {
              const IconComponent = step.icon;
              return (
                <div key={step.n} className="bg-slate-950/40 p-6 flex flex-col items-start text-left space-y-4 border border-slate-900 rounded-2xl hover:border-slate-800 transition-all">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                    style={{ background: `${step.color}12`, color: step.color }}
                  >
                    <IconComponent size={20} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-bold text-base leading-tight text-white">
                      {step.n}. {step.title}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-400">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 4: Live Example ─────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-[1280px] mx-auto relative z-10">
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Live Example
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">Worksheet Crop &rarr; AI Structured Data</h2>
          <p className="text-sm text-slate-500">Real-time mapping of crop coordinates to database keys</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
          {/* Handwritten image simulator */}
          <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-900 flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/10 opacity-30 flex items-center justify-center">
              <div className="w-full h-0.5 bg-blue-500/40 animate-pulse" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Worksheet Image Segment</p>
            <div className="space-y-4 border border-slate-800 p-5 rounded-xl bg-slate-900/30 w-full max-w-xs text-center font-serif text-lg text-slate-300">
              <p className="border-b border-slate-800 pb-2">Q1. Solve: 14 + 19</p>
              <p className="text-white font-extrabold pt-2">Student Answer: 23</p>
              <div className="text-[10px] text-rose-500 font-sans font-bold bg-rose-500/10 py-1 rounded border border-rose-500/20 mt-2">
                [AI Detection Area: Carry-Over Overlooked]
              </div>
            </div>
          </div>

          {/* Extracted JSON schema representation */}
          <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-900 font-mono text-xs text-slate-400 space-y-4">
            <p className="text-slate-500 font-bold uppercase tracking-wider">Structured JSON Payload</p>
            <pre className="text-blue-400 leading-relaxed overflow-x-auto bg-slate-950 p-4 rounded-xl border border-slate-900">
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

      {/* ── Section 5: Interactive Screens Demo ─────────────────────────── */}
      <section id="screenshots-section" className="py-32 px-6 bg-slate-950/20 border-t border-b border-slate-900 relative z-10">
        <div className="max-w-[1280px] mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Application Preview
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">Explore the Platform</h2>
            <p className="text-sm text-slate-500">Interactive preview of workspaces built for teachers</p>
          </div>

          {/* Selector Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-900/60 p-1 rounded-2xl flex gap-1 border border-slate-800/80 backdrop-blur-md overflow-x-auto max-w-full">
              {[
                { id: "upload", label: "1. Upload Interface" },
                { id: "verify", label: "2. Verification Sandbox" },
                { id: "dashboard", label: "3. Insights Center" },
                { id: "offline", label: "4. True Offline OCR" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setPreviewTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${previewTab === t.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mock Browser Wrapper */}
          <div className="bg-slate-950 border border-slate-900 shadow-2xl rounded-2xl overflow-hidden max-w-4xl mx-auto">
            <div className="bg-slate-950 p-3 border-b border-slate-900 flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
              <span className="text-[10px] text-slate-700 font-mono">app.kagaz.ai (Local Edge-Mode)</span>
              <div className="flex items-center gap-1 bg-[#22C55E]/10 text-[#22C55E] px-2 py-0.5 rounded text-[9px] font-bold">
                <Wifi size={10} className="opacity-80" />
                <span>Simulated Offline</span>
              </div>
            </div>

            <div className="p-8 min-h-[350px] flex items-center justify-center bg-slate-950/40">
              {previewTab === "upload" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full animate-fade-in">
                  <div className="space-y-4">
                    <h3 className="text-lg font-extrabold text-white">Batch Upload Dashboard</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Upload worksheet images. When horizontal scale is required or Redis is configured, tasks are offloaded to asynchronous Celery queues automatically to maintain server uptime.
                    </p>
                    <ul className="text-xs font-bold text-slate-400 space-y-2">
                      <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Bulk image drag and drop</li>
                      <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Offline cache queueing</li>
                      <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Autorecovery on reconnections</li>
                    </ul>
                  </div>
                  <div className="bg-slate-900/30 p-6 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-center py-12">
                    <Upload className="text-blue-500 mb-2 animate-bounce" size={32} />
                    <p className="text-xs font-bold text-slate-300">Drop files here to start upload</p>
                    <p className="text-[10px] text-slate-500 mt-1">Accepts JPG, PNG up to 5MB</p>
                  </div>
                </div>
              )}

              {previewTab === "verify" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full animate-fade-in">
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="text-lg font-extrabold text-white">Human-in-the-Loop Sandbox</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Review extracted numeral fields side-by-side with original scanned images. Correct OCR glitches directly before writing records to the database.
                    </p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center font-mono text-xs">
                    <p className="text-slate-500 mb-2">Original Crop Segment</p>
                    <p className="text-2xl font-bold font-serif my-4 text-white">14 + 19 = 23</p>
                  </div>
                  <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corrected Extracted Answer</label>
                      <input type="text" readOnly value="23" className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <button className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex-1">Modify</button>
                      <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex-1">Confirm</button>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === "dashboard" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full animate-fade-in">
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="text-lg font-extrabold text-white">Class Analytics</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Track performance metrics, check extraction accuracy stats, and view structural concept gap distributions.
                    </p>
                  </div>
                  <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800 space-y-3">
                    <p className="text-xs font-bold text-slate-300">Remedial Priority List</p>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex justify-between text-rose-400 font-bold bg-rose-500/5 p-2 rounded">
                        <span>Addition Carry-Over</span>
                        <span>74% Affected</span>
                      </div>
                      <div className="flex justify-between text-orange-400 font-bold bg-orange-500/5 p-2 rounded">
                        <span>Place Value Alignment</span>
                        <span>42% Affected</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900/30 p-4 rounded-xl border border-blue-500/10 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                    <p className="text-xs font-bold text-slate-200">Recommended Action Plan</p>
                    <p className="text-xs text-slate-400 mt-2">Deploy Base-Ten blocks bundling drills during math lab hours tomorrow.</p>
                  </div>
                </div>
              )}

              {previewTab === "offline" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full animate-fade-in">
                  <div className="space-y-4">
                    <h3 className="text-lg font-extrabold text-white">Browser Edge OCR Sandbox</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Demonstrates local client-side extraction. By running a quantized ONNX OCR model on device via Web Workers, worksheets are processed directly in the teacher's browser with **zero network latency and absolute offline privacy**.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Edge Model: Quantized CRNN (11.4 MB) Loaded</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        *Suitable for low-resource environments and offline rural school coverage.
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-bold uppercase">Binarization Preprocessing</span>
                        <span className="text-blue-400 font-bold">Local Edge Filter</span>
                      </div>
                      {/* Binarization Slider mockup */}
                      <div className="h-24 bg-black rounded-lg border border-slate-950 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute left-0 right-0 top-0 bottom-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                        <span className="text-white font-mono text-2xl font-black select-none tracking-widest opacity-80 filter contrast-200">52 - 18 = 44</span>
                        {/* Interactive sliding threshold line */}
                        <div className="absolute top-0 bottom-0 left-[60%] w-0.5 bg-blue-500">
                          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-blue-400" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                      <span className="text-slate-500">Local Output:</span>
                      <span className="text-emerald-400 font-bold">{"{ digits: [52, 18, 44] }"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5.5: Tech Stack ────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-[1280px] mx-auto relative z-10 text-center space-y-12">
        <div className="space-y-3">
          <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Developer Spec
          </span>
          <h2 className="text-3xl font-extrabold text-white">Architectural Tech Stack</h2>
          <p className="text-sm text-slate-500">Robust layers engineered for modular local testing and live staging</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 pt-4">
          {[
            { name: "Next.js 15", desc: "React Framework", icon: Code, color: "#ffffff" },
            { name: "FastAPI", desc: "Asynchronous Python API", icon: Zap, color: "#009688" },
            { name: "PaddleOCR", desc: "Numerals Extraction", icon: Search, color: "#FF5722" },
            { name: "Gemini API", desc: "LLM Gap Diagnosis", icon: Brain, color: "#2196F3" },
            { name: "Supabase Auth", desc: "JWT Authentication", icon: ShieldCheck, color: "#3ECF8E" },
            { name: "PostgreSQL", desc: "Structured Database", icon: Database, color: "#336791" }
          ].map(tech => {
            const Icon = tech.icon;
            return (
              <div key={tech.name} className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl flex flex-col items-center justify-center space-y-2 hover:border-slate-800 transition-all">
                <Icon size={24} style={{ color: tech.color }} />
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-200">{tech.name}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{tech.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 6: Regional Impact ─────────────────────────────────── */}
      <section className="py-32 px-6 max-w-[1280px] mx-auto relative z-10 border-t border-slate-900">
        <div className="space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              Reliability
            </span>
            <h2 className="text-3xl font-extrabold text-white">Designed for India's Educational Realities</h2>
            <p className="text-sm text-slate-500">Engineered to work reliably across rural government schools</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                <Clock size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-white">90% Less Manual Work</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Transform a 2-hour stack grading hurdle into a 10-minute automated photo sync. Reclaim hours of classroom prep time.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                <Wifi size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-white">Offline Ready</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Queue captured sheets offline via IndexedDB. Your roster syncs automatically once an active connection is detected.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 flex-shrink-0">
                <FileImage size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-white">Handwritten OCR Adapters</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Advanced OCR models adapt to real student pencil writing, local numerical scripts, and standard notebook lighting.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#22C55E] flex-shrink-0">
                <Globe size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-white">Multilingual Capabilities</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Switch instantly between Hindi and English languages to accommodate varying teacher preferences and regions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: CTA ──────────────────────────────────────────────── */}
      <section
        className="py-32 px-6 text-white relative z-10"
        style={{ 
          background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
          borderTop: "1px solid rgba(255,255,255,0.1)" 
        }}
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-heading">
            Start Grading Smarter
          </h2>
          <p className="text-blue-100 max-w-lg mx-auto leading-relaxed text-sm font-medium">
            Join schools across India who are reclaiming teaching time and identifying learning gaps in real time.
          </p>
          <div>
            <Link
              href="/signup"
              className="btn btn-primary btn-lg bg-white text-blue-900 font-bold hover:bg-blue-50 shadow-xl cursor-pointer"
              style={{ background: "#ffffff", color: "#2563EB", border: "none" }}
            >
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="py-12 px-6 text-sm"
        style={{ 
          background: "rgba(10,10,10,0.8)", 
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderTop: "1px solid border-slate-900", 
          color: "var(--text-3)" 
        }}
      >
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-extrabold text-white">{t("appName")}</span>
          <span className="text-sm text-center text-slate-500">{t("footerText")}</span>
          <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
            <span>{t("logIn")} &rarr;</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
