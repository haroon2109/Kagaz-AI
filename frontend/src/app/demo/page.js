"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Camera, Brain, Layers, Play, RefreshCw, CheckCircle2, ArrowRight,
  Upload, FileText, Users, TrendingUp, ChevronRight, ChevronLeft,
  RotateCcw, Lightbulb, AlertTriangle, Sparkles, Clock, Package,
  ClipboardList, Info, Eye, Edit3, Check, X,
} from "lucide-react";

import {
  DEMO_STUDENTS, DEMO_ASSESSMENT, DEMO_QUESTIONS, SAMPLE_SCAN_RESULTS,
  OCR_CORRECTION, COMPETENCY_LABELS, CLASS_COMPETENCY_SUMMARY,
  ERROR_PATTERNS, CLASS_MAP, DEMO_GROUPS, TODAYS_ACTION,
  REASSESSMENT_QUESTIONS, REASSESSMENT_RESULTS, REGROUP_BEFORE,
  REGROUP_AFTER, STUDENT_MOVEMENTS, PROGRESS_TIMELINE, PROGRESS_NOTE,
  COMPETENCY_DETAILS,
} from "@/lib/demo-data";

/* ═══════════════════════════════════════════════════════════════════════════
   KAGAZ AI — HACKATHON DEMO MODE
   A polished, deterministic walkthrough of the full Kagaz loop.
   Never calls a live AI API. All data is fictional and pre-seeded.
   Reset button returns the demo to step 1 instantly.
   ═══════════════════════════════════════════════════════════════════════════ */

const STEPS = [
  { id: 1, label: "Scan",         icon: Camera,       color: "#1E3A8A" },
  { id: 2, label: "Understand",   icon: Brain,         color: "#7C3AED" },
  { id: 3, label: "Class Map",    icon: Users,         color: "#0F766E" },
  { id: 4, label: "Group",        icon: Layers,        color: "#F59E0B" },
  { id: 5, label: "Today's Action", icon: Play,        color: "#16A34A" },
  { id: 6, label: "Reassess",     icon: RefreshCw,     color: "#EC4899" },
  { id: 7, label: "Regroup",      icon: ArrowRight,    color: "#3B82F6" },
  { id: 8, label: "Progress",     icon: TrendingUp,    color: "#0F766E" },
];

// ── Progress Bar ───────────────────────────────────────────────────────────
function StepProgress({ currentStep, onStepClick }) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center gap-1 min-w-max px-2">
        {STEPS.map((step, i) => {
          const active = step.id === currentStep;
          const done = step.id < currentStep;
          const Icon = step.icon;
          return (
            <React.Fragment key={step.id}>
              {i > 0 && (
                <div
                  className="h-0.5 flex-1 min-w-[20px] max-w-[40px] rounded-full"
                  style={{
                    background: done ? step.color : "var(--border)",
                  }}
                />
              )}
              <button
                onClick={() => onStepClick(step.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                style={{
                  background: active ? step.color : done ? `${step.color}15` : "transparent",
                  color: active ? "#fff" : done ? step.color : "var(--text-3)",
                  border: active ? `2px solid ${step.color}` : "2px solid transparent",
                }}
                title={step.label}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Simulated OCR Animation ────────────────────────────────────────────────
function OCRAnimation({ onComplete }) {
  const [phase, setPhase] = useState(0); // 0=upload, 1=processing, 2=done
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Phase 0 → 1 after 800ms
    const t1 = setTimeout(() => setPhase(1), 800);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== 1) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setPhase(2);
            onComplete?.();
          }, 400);
          return 100;
        }
        return p + Math.random() * 15 + 5;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [phase, onComplete]);

  if (phase === 0) {
    return (
      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-4 bg-slate-50">
        <Camera size={40} className="mx-auto text-slate-300" />
        <div>
          <p className="text-sm font-extrabold text-slate-700">Upload scanned assessment</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">JPG, PNG — 30 students' papers</p>
        </div>
        <div className="flex justify-center">
          <button className="btn btn-primary btn-sm font-bold cursor-pointer">
            <Upload size={14} />
            <span>Simulate upload</span>
          </button>
        </div>
      </div>
    );
  }

  if (phase === 1) {
    const pct = Math.min(Math.round(progress), 100);
    return (
      <div className="border-2 border-[#1E3A8A]/30 rounded-2xl p-8 text-center space-y-4 bg-[#1E3A8A]/5">
        <div className="w-12 h-12 border-4 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin mx-auto" />
        <div className="space-y-2">
          <p className="text-sm font-extrabold text-[#1E3A8A]">Processing OCR…</p>
          <div className="w-full max-w-xs mx-auto h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1E3A8A] rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 font-semibold">
            Reading handwritten responses… {pct}%
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ── STEP 1: SCAN ───────────────────────────────────────────────────────────
function StepScan({ onCorrected }) {
  const [scanning, setScanning] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [correctionApplied, setCorrectionApplied] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleScanComplete = useCallback(() => {
    setScanning(false);
    setTimeout(() => setShowResults(true), 300);
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="chip chip-primary text-xs">Step 1</span>
          <span className="text-xs text-slate-400 font-semibold">~30 seconds</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Scan Student Work</h2>
        <p className="text-sm text-slate-600 font-medium">
          The teacher uploads a photo of the class assessment. Kagaz reads each handwritten response using vision OCR.
        </p>
      </div>

      {/* Assessment preview card */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center text-[#1E3A8A]">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900">{DEMO_ASSESSMENT.title}</p>
            <p className="text-xs text-slate-500 font-semibold">{DEMO_ASSESSMENT.description}</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 font-mono text-xs text-slate-700 space-y-1">
          {DEMO_QUESTIONS.map((q) => (
            <p key={q.number}>
              <span className="text-slate-400">Q{q.number}.</span> {q.text}
            </p>
          ))}
        </div>
      </div>

      {/* OCR Phase */}
      {scanning && <OCRAnimation onComplete={handleScanComplete} />}

      {/* Results */}
      {showResults && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-[#16A34A]">
            <CheckCircle2 size={18} />
            <span className="text-sm font-extrabold">30 papers scanned successfully</span>
          </div>

          <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
            Sample extractions (5 students shown)
          </p>

          <div className="space-y-3">
            {SAMPLE_SCAN_RESULTS.map((scan) => (
              <div key={scan.studentId} className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-xs font-bold">
                      {scan.studentName[0]}
                    </div>
                    <span className="text-sm font-extrabold text-slate-900">{scan.studentName}</span>
                  </div>
                  <span className="chip chip-success text-[10px]">Read ✓</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {DEMO_QUESTIONS.map((q) => {
                    const answer = scan.answers[q.number];
                    const isCorrect = answer === q.correctAnswer;
                    return (
                      <div key={q.number} className="text-center">
                        <p className="text-[10px] text-slate-400 font-bold">Q{q.number}</p>
                        <p
                          className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: isCorrect ? "#f0fdf4" : "#fef2f2",
                            color: isCorrect ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {answer}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* OCR Correction — Human in the loop */}
          <div className="card p-4 space-y-3" style={{ borderColor: "#F59E0B", borderWidth: 2 }}>
            <div className="flex items-center gap-2">
              <Edit3 size={16} className="text-[#F59E0B]" />
              <span className="text-sm font-extrabold text-slate-900">Teacher corrects an OCR read</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {OCR_CORRECTION.studentName}&apos;s paper — Q{OCR_CORRECTION.questionNo}:
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <X size={14} className="text-red-500" />
                <span className="text-sm font-bold font-mono text-red-700">{OCR_CORRECTION.originalRead}</span>
                <span className="text-[10px] text-red-400 font-semibold">OCR read</span>
              </div>
              <ArrowRight size={14} className="text-slate-400" />
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                <Check size={14} className="text-green-600" />
                <span className="text-sm font-bold font-mono text-green-700">{OCR_CORRECTION.correctedTo}</span>
                <span className="text-[10px] text-green-500 font-semibold">Corrected</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium italic">{OCR_CORRECTION.note}</p>
            {!correctionApplied ? (
              <button
                onClick={() => { setCorrectionApplied(true); setEditing(true); onCorrected?.(); }}
                className="btn btn-secondary btn-sm font-bold cursor-pointer"
              >
                <Check size={14} />
                <span>Apply correction</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-[#16A34A] text-xs font-bold">
                <CheckCircle2 size={14} />
                Correction applied — teacher verified
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── STEP 2: UNDERSTAND ─────────────────────────────────────────────────────
function StepUnderstand() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="chip chip-primary text-xs">Step 2</span>
          <span className="text-xs text-slate-400 font-semibold">~45 seconds</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Understand Learning Gaps</h2>
        <p className="text-sm text-slate-600 font-medium">
          The evidence engine maps every answer to a competency. Recurring patterns across students get flagged with confidence levels.
        </p>
      </div>

      {/* Competency summary */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Competency status across 30 students</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 font-bold text-slate-700">Competency</th>
                <th className="text-center p-3 font-bold" style={{ color: "#15803d" }}>Demonstrated</th>
                <th className="text-center p-3 font-bold" style={{ color: "#b45309" }}>Developing</th>
                <th className="text-center p-3 font-bold" style={{ color: "#b91c1c" }}>Needs support</th>
              </tr>
            </thead>
            <tbody>
              {CLASS_COMPETENCY_SUMMARY.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800">{c.label}</td>
                  <td className="p-3 text-center font-bold">{c.demonstrated}</td>
                  <td className="p-3 text-center font-bold">{c.developing}</td>
                  <td className="p-3 text-center font-bold">{c.needsSupport}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error patterns */}
      <div className="space-y-3">
        <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
          Observable error patterns
        </p>
        {ERROR_PATTERNS.map((ep, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-slate-900">{ep.pattern}</p>
                <p className="text-xs text-slate-600 font-medium">{ep.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-black text-slate-900">{ep.affectedCount}</p>
                <p className="text-[10px] text-slate-400 font-bold">{ep.affectedPercent}% of class</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              {ep.evidence.map((e, j) => (
                <p key={j} className="text-xs font-mono text-slate-600">• {e}</p>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className={`chip text-[10px] ${ep.confidence === "high" ? "chip-success" : "chip-warning"}`}>
                {ep.confidence} confidence
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">{ep.confidenceNote}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Deep-dive: one student example */}
      <div className="space-y-3">
        <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
          Evidence for one student (Priya)
        </p>
        {COMPETENCY_DETAILS.map((cd) => (
          <div key={cd.id} className="card p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-extrabold text-slate-900">{cd.label}</span>
              <span className={`chip text-[10px] ${cd.status === "demonstrated" ? "chip-success" : cd.status === "developing" ? "chip-warning" : "chip-error"}`}>
                {cd.status}
              </span>
              <span className="chip chip-neutral text-[10px]">{cd.confidence} confidence</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">{cd.why}</p>
            <div className="space-y-1.5">
              {cd.evidence.map((ev, j) => (
                <div key={j} className="bg-slate-50 rounded-lg p-2.5 text-xs font-mono space-y-0.5">
                  <p className="font-bold text-slate-800">{ev.question}</p>
                  <p>Student: <span className="font-bold text-red-600">{ev.studentAnswer}</span> · Expected: <span className="font-bold text-green-600">{ev.expected}</span></p>
                  <p className="text-slate-500">{ev.observation}</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#1E3A8A]/5 border border-[#1E3A8A]/15">
              <Lightbulb size={14} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
              <p className="text-xs font-semibold text-slate-700">{cd.recommendation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── STEP 3: CLASS LEARNING MAP ─────────────────────────────────────────────
function StepClassMap() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="chip chip-primary text-xs">Step 3</span>
          <span className="text-xs text-slate-400 font-semibold">~30 seconds</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Class Learning Map</h2>
        <p className="text-sm text-slate-600 font-medium">
          30 students distributed across learning needs. This is not a marks list — it shows where each student needs support.
        </p>
      </div>

      {/* Distribution bar */}
      <div className="card p-5 space-y-3">
        <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Where the class stands</p>
        <div className="flex h-8 rounded-xl overflow-hidden">
          {CLASS_MAP.map((tier) => (
            <div
              key={tier.tier}
              className="flex items-center justify-center text-white text-xs font-extrabold"
              style={{
                width: `${(tier.count / 30) * 100}%`,
                background: tier.color,
              }}
            >
              {tier.count}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {CLASS_MAP.map((tier) => (
            <div key={tier.tier} className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="w-3 h-3 rounded" style={{ background: tier.color }} />
              <span className="text-slate-700">{tier.label}</span>
              <span className="text-slate-400">({tier.count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tier cards */}
      {CLASS_MAP.map((tier) => (
        <div
          key={tier.tier}
          className="card p-5 space-y-3"
          style={{ borderLeftWidth: 4, borderLeftColor: tier.color }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-extrabold text-slate-900">{tier.label}</p>
              <p className="text-xs text-slate-500 font-semibold">{tier.description}</p>
            </div>
            <span
              className="text-2xl font-black"
              style={{ color: tier.color }}
            >
              {tier.count}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tier.students.map((name) => (
              <span
                key={name}
                className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  background: `${tier.color}12`,
                  color: tier.color,
                  border: `1px solid ${tier.color}30`,
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── STEP 4: GROUP ──────────────────────────────────────────────────────────
function StepGroup() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="chip chip-primary text-xs">Step 4</span>
          <span className="text-xs text-slate-400 font-semibold">~30 seconds</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Learning Groups</h2>
        <p className="text-sm text-slate-600 font-medium">
          Students are grouped by demonstrated competency — not marks. Each group has a specific focus and recommended activity.
        </p>
      </div>

      {DEMO_GROUPS.map((group) => {
        const tierColors = {
          g1: { bg: "#DC262610", border: "#DC262630", text: "#DC2626" },
          g2: { bg: "#F59E0B10", border: "#F59E0B30", text: "#F59E0B" },
          g3: { bg: "#3B82F610", border: "#3B82F630", text: "#3B82F6" },
          g4: { bg: "#22C55E10", border: "#22C55E30", text: "#22C55E" },
        };
        const c = tierColors[group.id] || tierColors.g1;

        return (
          <div key={group.id} className="card p-5 space-y-4" style={{ background: c.bg, borderColor: c.border, borderWidth: 2 }}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-slate-900">{group.name}</span>
                  <span className="chip chip-neutral text-[10px]">{group.memberCount} students</span>
                </div>
                <p className="text-sm font-semibold text-slate-700">Focus: {group.focusLabel}</p>
                <p className="text-xs text-slate-500 font-medium">Current competency: {group.currentCompetency}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-slate-200 space-y-1">
              <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Recommended focus</p>
              <p className="text-sm font-bold text-slate-800">{group.focus}</p>
              <p className="text-xs text-slate-500 font-medium">{group.recommendedActivity}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {group.members.map((name) => (
                <span key={name} className="chip chip-neutral text-[11px]">{name}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── STEP 5: TODAY'S ACTION ─────────────────────────────────────────────────
function StepTodaysAction() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="chip chip-primary text-xs">Step 5</span>
          <span className="text-xs text-slate-400 font-semibold">~45 seconds</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Today&apos;s Action</h2>
        <p className="text-sm text-slate-600 font-medium">
          The teacher knows exactly what to do for the next 10 minutes — with locally available materials.
        </p>
      </div>

      {/* Headline card */}
      <div className="card p-5 space-y-2" style={{ borderColor: "#16A34A", borderWidth: 2 }}>
        <div className="flex items-center gap-2">
          <Play size={18} className="text-[#16A34A]" />
          <span className="chip chip-success text-xs">Recommended</span>
        </div>
        <h3 className="text-lg font-extrabold text-slate-900">{TODAYS_ACTION.headline}</h3>
        <p className="text-sm text-slate-600 font-semibold">Focus: {TODAYS_ACTION.focus}</p>
      </div>

      {/* Warm-up */}
      <div className="card p-5 space-y-2" style={{ background: "#f0fdfa", borderColor: "rgba(15,118,110,0.2)" }}>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#0F766E]" />
          <span className="text-sm font-extrabold text-[#0F766E]">{TODAYS_ACTION.warmUp.title}</span>
        </div>
        <p className="text-sm text-slate-700 font-medium">{TODAYS_ACTION.warmUp.description}</p>
      </div>

      {/* Main activity */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Play size={16} className="text-[#1E3A8A]" />
          <span className="text-sm font-extrabold text-slate-900">{TODAYS_ACTION.mainActivity.title}</span>
        </div>
        <ol className="space-y-2">
          {TODAYS_ACTION.mainActivity.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-700">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: "#1E3A8A15", color: "#1E3A8A" }}
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Quick check */}
      <div className="card p-5 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#F59E0B]" />
          <span className="text-sm font-extrabold text-slate-900">{TODAYS_ACTION.check.title}</span>
        </div>
        <p className="text-sm text-slate-700 font-medium">{TODAYS_ACTION.check.description}</p>
      </div>

      {/* Materials */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-slate-500" />
          <span className="text-sm font-extrabold text-slate-900">Materials — all locally available</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TODAYS_ACTION.materials.map((m) => (
            <span key={m} className="chip chip-neutral text-xs">{m}</span>
          ))}
        </div>
        <p className="text-xs text-slate-500 font-medium italic">
          No printing needed beyond the assessment paper.
        </p>
      </div>

      {/* Expected outcome */}
      <div className="alert alert-info">
        <Info size={18} className="flex-shrink-0" />
        <span className="text-sm font-medium">{TODAYS_ACTION.expectedOutcome}</span>
      </div>
    </div>
  );
}

// ── STEP 6: QUICK REASSESSMENT ─────────────────────────────────────────────
function StepReassess() {
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="chip chip-primary text-xs">Step 6</span>
          <span className="text-xs text-slate-400 font-semibold">~45 seconds</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Quick Reassessment</h2>
        <p className="text-sm text-slate-600 font-medium">
          After the activity, Kagaz generates a short targeted check for Group C. The teacher runs it with the group, then scans the answers.
        </p>
      </div>

      {/* Questions */}
      <div className="card p-5 space-y-3">
        <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Quick check — Group C</p>
        <div className="space-y-2">
          {REASSESSMENT_QUESTIONS.map((q) => (
            <div key={q.number} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="w-7 h-7 rounded-full bg-[#EC4899] text-white flex items-center justify-center text-xs font-bold">
                {q.number}
              </span>
              <span className="text-sm font-bold text-slate-800 font-mono">{q.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scan trigger */}
      {!scanned && (
        <div className="card p-5 text-center space-y-3">
          {scanning ? (
            <div className="space-y-3">
              <div className="w-10 h-10 border-4 border-[#EC4899]/20 border-t-[#EC4899] rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-[#EC4899]">Scanning Group C papers…</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 font-medium">Teacher scans the 10 Group C papers after the activity</p>
              <button onClick={handleScan} className="btn btn-primary btn-sm font-bold cursor-pointer">
                <Camera size={14} />
                <span>Simulate scan</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Results */}
      {scanned && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-[#16A34A]">
            <CheckCircle2 size={18} />
            <span className="text-sm font-extrabold">10 papers scanned — results ready</span>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left p-3 font-bold text-slate-700">Student</th>
                    <th className="text-center p-3 font-bold text-slate-700">Before</th>
                    <th className="text-center p-3 font-bold text-slate-700">Q1</th>
                    <th className="text-center p-3 font-bold text-slate-700">Q2</th>
                    <th className="text-center p-3 font-bold text-slate-700">Q3</th>
                    <th className="text-center p-3 font-bold text-slate-700">After</th>
                    <th className="text-center p-3 font-bold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {REASSESSMENT_RESULTS.map((r) => (
                    <tr key={r.name} className="border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-800">{r.name}</td>
                      <td className="p-3 text-center">
                        <span className="chip chip-error text-[10px]">needs support</span>
                      </td>
                      {r.answers.map((a, i) => (
                        <td key={i} className="p-3 text-center font-mono font-bold">{a}</td>
                      ))}
                      <td className="p-3 text-center">
                        <span className={`chip text-[10px] ${r.after === "demonstrated" ? "chip-success" : r.after === "developing" ? "chip-warning" : "chip-error"}`}>
                          {r.after}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {r.advanced ? (
                          <span className="text-[#16A34A] font-bold text-xs">↑ advanced</span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="alert alert-success">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium">
              <strong>7 of 10</strong> students demonstrated regrouping after the activity. 3 continue to need support.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STEP 7: REGROUP ────────────────────────────────────────────────────────
function StepRegroup() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="chip chip-primary text-xs">Step 7</span>
          <span className="text-xs text-slate-400 font-semibold">~30 seconds</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Regroup</h2>
        <p className="text-sm text-slate-600 font-medium">
          Students who demonstrated the target skill move up. Others keep support. Groups are rebuilt automatically.
        </p>
      </div>

      {/* Before / After comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before */}
        <div className="card p-5 space-y-3" style={{ borderColor: "#DC262640", borderWidth: 2 }}>
          <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Before activity</p>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-700">Need support</span>
              <span className="text-2xl font-black" style={{ color: "#b91c1c" }}>{REGROUP_BEFORE.needsSupport}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-700">Developing</span>
              <span className="text-2xl font-black" style={{ color: "#b45309" }}>{REGROUP_BEFORE.developing}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-700">Demonstrated</span>
              <span className="text-2xl font-black" style={{ color: "#15803d" }}>{REGROUP_BEFORE.demonstrated}</span>
            </div>
          </div>
        </div>

        {/* After */}
        <div className="card p-5 space-y-3" style={{ borderColor: "#22C55E40", borderWidth: 2 }}>
          <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">After activity</p>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-700">Need support</span>
              <span className="flex items-baseline gap-2">
                <span className="text-2xl font-black" style={{ color: "#b91c1c" }}>{REGROUP_AFTER.needsSupport}</span>
                <span className="text-sm font-bold text-emerald-500">↓{REGROUP_BEFORE.needsSupport - REGROUP_AFTER.needsSupport}</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-700">Developing</span>
              <span className="text-2xl font-black" style={{ color: "#b45309" }}>{REGROUP_AFTER.developing}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-700">Demonstrated</span>
              <span className="flex items-baseline gap-2">
                <span className="text-2xl font-black" style={{ color: "#15803d" }}>{REGROUP_AFTER.demonstrated}</span>
                <span className="text-sm font-bold text-emerald-500">↑{REGROUP_AFTER.demonstrated - REGROUP_BEFORE.demonstrated}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual bar comparison */}
      <div className="card p-5 space-y-4">
        <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Competency distribution shift</p>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold text-slate-500 mb-1">Before</p>
            <div className="flex h-6 rounded-lg overflow-hidden">
              <div className="flex items-center justify-center text-white text-[10px] font-bold" style={{ width: `${(REGROUP_BEFORE.demonstrated / 30) * 100}%`, background: "#22C55E" }}>
                {REGROUP_BEFORE.demonstrated}
              </div>
              <div className="flex items-center justify-center text-white text-[10px] font-bold" style={{ width: `${(REGROUP_BEFORE.developing / 30) * 100}%`, background: "#F59E0B" }}>
                {REGROUP_BEFORE.developing}
              </div>
              <div className="flex items-center justify-center text-white text-[10px] font-bold" style={{ width: `${(REGROUP_BEFORE.needsSupport / 30) * 100}%`, background: "#DC2626" }}>
                {REGROUP_BEFORE.needsSupport}
              </div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 mb-1">After</p>
            <div className="flex h-6 rounded-lg overflow-hidden">
              <div className="flex items-center justify-center text-white text-[10px] font-bold" style={{ width: `${(REGROUP_AFTER.demonstrated / 30) * 100}%`, background: "#22C55E" }}>
                {REGROUP_AFTER.demonstrated}
              </div>
              <div className="flex items-center justify-center text-white text-[10px] font-bold" style={{ width: `${(REGROUP_AFTER.developing / 30) * 100}%`, background: "#F59E0B" }}>
                {REGROUP_AFTER.developing}
              </div>
              <div className="flex items-center justify-center text-white text-[10px] font-bold" style={{ width: `${(REGROUP_AFTER.needsSupport / 30) * 100}%`, background: "#DC2626" }}>
                {REGROUP_AFTER.needsSupport}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student movements */}
      <div className="space-y-3">
        <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Students who advanced</p>
        {STUDENT_MOVEMENTS.map((m) => (
          <div key={m.name} className="card p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#22C55E] text-white flex items-center justify-center text-xs font-bold">
              {m.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">{m.name}</p>
              <p className="text-xs text-slate-500 font-medium truncate">{m.from}</p>
            </div>
            <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
            <div className="text-right min-w-0">
              <p className="text-xs font-bold text-[#16A34A]">{m.to}</p>
              <p className="text-[10px] text-slate-400">{m.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Honest framing */}
      <div className="alert alert-info">
        <Info size={18} className="flex-shrink-0" />
        <span className="text-sm font-medium">
          More students demonstrated the target skill after the intervention. This is observed change — not a claim that Kagaz caused the improvement.
        </span>
      </div>
    </div>
  );
}

// ── STEP 8: PROGRESS ───────────────────────────────────────────────────────
function StepProgressFinal() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="chip chip-primary text-xs">Step 8</span>
          <span className="text-xs text-slate-400 font-semibold">~30 seconds</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Progress</h2>
        <p className="text-sm text-slate-600 font-medium">
          A simple view of how the class moved — before and after.
        </p>
      </div>

      {/* Progress bars */}
      <div className="card p-5 space-y-4">
        <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Skill progression</p>
        {PROGRESS_TIMELINE.map((t) => {
          const total = t.demonstrated + t.developing + t.needsSupport;
          return (
            <div key={t.date} className="space-y-2">
              <p className="text-sm font-bold text-slate-700">{t.date}</p>
              <div className="flex h-8 rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${(t.demonstrated / total) * 100}%`, background: "#22C55E" }}
                >
                  {t.demonstrated} demonstrated
                </div>
                <div
                  className="flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${(t.developing / total) * 100}%`, background: "#F59E0B" }}
                >
                  {t.developing} developing
                </div>
                <div
                  className="flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${(t.needsSupport / total) * 100}%`, background: "#DC2626" }}
                >
                  {t.needsSupport}
                </div>
              </div>
              <div className="flex gap-4 text-xs font-semibold text-slate-500">
                <span>✓ {t.demonstrated} demonstrated</span>
                <span>◐ {t.developing} developing</span>
                <span>○ {t.needsSupport} need support</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Honest note */}
      <div className="alert alert-info">
        <Info size={18} className="flex-shrink-0" />
        <span className="text-sm font-medium">{PROGRESS_NOTE}</span>
      </div>

      {/* Final message */}
      <div className="card p-8 text-center space-y-4" style={{ background: "linear-gradient(135deg, #1E3A8A, #0F766E)", border: "none" }}>
        <Sparkles size={32} className="mx-auto text-white/80" />
        <h3 className="text-xl font-extrabold text-white leading-tight">
          Kagaz turns student work into the teacher&apos;s next action.
        </h3>
        <p className="text-sm text-white/70 font-medium max-w-md mx-auto">
          Scan → Understand → Group → Act → Reassess → Regroup. Every step is evidence-based and teacher-verified.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DEMO PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DemoPage() {
  const [step, setStep] = useState(1);
  const [scanCorrected, setScanCorrected] = useState(false);
  const mainRef = useRef(null);

  const goToStep = useCallback((n) => {
    setStep(n);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const next = useCallback(() => {
    if (step < 8) goToStep(step + 1);
  }, [step, goToStep]);

  const prev = useCallback(() => {
    if (step > 1) goToStep(step - 1);
  }, [step, goToStep]);

  const reset = useCallback(() => {
    setStep(1);
    setScanCorrected(false);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setStep((s) => Math.min(s + 1, 8));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setStep((s) => Math.max(s - 1, 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const StepComponent = [
    null, StepScan, StepUnderstand, StepClassMap, StepGroup,
    StepTodaysAction, StepReassess, StepRegroup, StepProgressFinal,
  ][step];

  return (
    <div className="min-h-screen flex flex-col bg-mesh">
      {/* ── Demo Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-sm font-extrabold text-[#1E3A8A] flex-shrink-0">
              Kagaz AI
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20 flex-shrink-0">
              DEMO MODE
            </span>
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              Step {step} of 8 — {STEPS[step - 1].label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="btn btn-ghost btn-sm font-bold cursor-pointer"
              title="Reset demo to step 1"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
            <Link href="/" className="btn btn-ghost btn-sm font-bold cursor-pointer">
              Home
            </Link>
          </div>
        </div>

        {/* Step progress bar */}
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <StepProgress currentStep={step} onStepClick={goToStep} />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {/* Step content */}
          {StepComponent && (
            <StepComponent
              onCorrected={() => setScanCorrected(true)}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={prev}
              disabled={step === 1}
              className="btn btn-ghost btn-sm font-bold cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1.5">
              {STEPS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => goToStep(s.id)}
                  className="w-2.5 h-2.5 rounded-full transition-all cursor-pointer"
                  style={{
                    background: s.id === step ? s.color : s.id < step ? `${s.color}60` : "var(--border)",
                    transform: s.id === step ? "scale(1.3)" : "scale(1)",
                  }}
                  title={s.label}
                />
              ))}
            </div>

            {step < 8 ? (
              <button onClick={next} className="btn btn-primary btn-sm font-bold cursor-pointer">
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={reset} className="btn btn-primary btn-sm font-bold cursor-pointer">
                <RotateCcw size={14} />
                <span>Reset Demo</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* ── Demo Footer ── */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center">
        <p className="text-xs text-slate-400 font-medium">
          This is a deterministic demo with fictional data. No real student information is used.
          <br />
          <Link href="/login" className="text-[#1E3A8A] font-bold hover:underline">
            Try the real Kagaz →
          </Link>
        </p>
      </footer>
    </div>
  );
}
