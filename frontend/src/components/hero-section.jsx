"use client";

import React from "react";
import Link from "next/link";
import { Camera, Play, Sparkles, FileText, CheckCircle2, Brain, Wifi } from "lucide-react";

export function HeroSection({ onTryDemoClick, onWatchVideoClick }) {
  return (
    <section className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 z-10 bg-transparent">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* ─── LEFT COLUMN: TEXT ─── */}
        <div className="space-y-6 text-left animate-fade-in">
          {/* Institutional Trust Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold border-2 border-[#0F766E]/40 w-fit"
            style={{ background: "rgba(15, 118, 110, 0.08)", color: "#0F766E" }}
          >
            <Sparkles size={14} className="text-[#0F766E]" />
            <span>Classroom Verified • Designed for Indian Schools</span>
          </div>

          {/* Main Accessible Headline */}
          <div className="space-y-4">
            <h1 
              className="text-3xl md:text-5xl font-black tracking-tight leading-[1.2] text-[#0F172A]"
            >
              From Student Work to the <span className="text-[#1E3A8A] underline decoration-[#0F766E] decoration-4">Next Teaching Action</span>
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-[#334155] font-semibold max-w-lg">
              Scan. Understand. Group. Act. Reassess. Kagaz AI reads handwritten student work, maps it to foundational competencies, finds evidence-based learning gaps, and tells you what to teach next — with locally available materials.
            </p>
          </div>

          {/* High-Contrast "Thick-Finger" CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              href="/demo"
              className="w-full sm:w-auto min-h-[52px] py-4 px-8 text-base font-black rounded-xl shadow-md bg-[#1E3A8A] hover:bg-[#172554] text-white transition-all transform active:scale-[0.98] border-2 border-[#172554] flex items-center justify-center gap-2 cursor-pointer no-underline"
            >
              <Camera size={20} />
              <span>Try Demo Class</span>
            </Link>
            <button
              onClick={onWatchVideoClick}
              className="w-full sm:w-auto min-h-[52px] py-4 px-8 text-base font-black rounded-xl border-2 border-slate-700 bg-white hover:bg-slate-50 text-[#0F172A] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play size={16} className="fill-[#1E3A8A] text-[#1E3A8A]" />
              <span>Watch 2-Min Demo</span>
            </button>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: HIGH-CONTRAST MOCKUP ─── */}
        <div className="relative animate-slide-up">
          {/* Clean high-contrast card border */}
          <div className="relative z-10 bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-xl max-w-md mx-auto overflow-hidden">
            {/* Header controls */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200 mb-4">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              </div>
              <span className="text-xs text-slate-700 font-mono font-bold">kagaz_web_portal</span>
              <div className="flex items-center gap-1 bg-[#1E3A8A]/10 text-[#1E3A8A] px-2 py-0.5 rounded text-[10px] font-bold">
                <Wifi size={10} />
                <span>Cloud Sync</span>
              </div>
            </div>

            {/* Simulated OCR File Card */}
            <div className="space-y-4">
              <div className="p-3 bg-[#F8FAFC] rounded-xl border-2 border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1E3A8A]/10 flex items-center justify-center text-[#1E3A8A]">
                  <FileText size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">subtraction_borrowing.png</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">Primary Math Grade 3 • 1.4 MB</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#16A34A]/15 text-[#16A34A] font-extrabold">Cleaned</span>
              </div>

              {/* High-Contrast Live OCR Scanning Indicator */}
              <div className="relative p-4 bg-[#F1F5F9] rounded-xl border-2 border-slate-300 space-y-3 overflow-hidden">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-800 font-bold">What Kagaz Read</span>
                  <span className="text-[#D97706] font-extrabold bg-[#D97706]/10 px-2 py-0.5 rounded">Teacher: verify 1 answer</span>
                </div>
                <div className="font-mono text-xs text-slate-900 space-y-1 bg-white p-3 rounded-lg border-2 border-slate-300">
                  <p className="text-slate-500 font-bold">&gt; Scanning inputs...</p>
                  <p className="text-[#1E3A8A] font-bold">&gt; Q1: 52 - 18 = <span className="font-black underline bg-yellow-100 px-1 text-slate-900">44</span></p>
                  <p className="text-[#DC2626] font-bold">&gt; Pattern: borrow error likely — teacher confirms</p>
                </div>
              </div>

              {/* Grounded Pedagogical Gaps Feedback Panel */}
              <div className="p-3.5 bg-[#F0FDF4] rounded-xl border-2 border-[#16A34A]/40 space-y-2">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-[#16A34A]" />
                  <span className="text-[10px] font-black text-[#16A34A] uppercase tracking-wider">Evidence Engine</span>
                </div>
                <p className="text-xs font-black text-slate-900">Pattern found across 3 items → regrouping needs support (medium confidence)</p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#16A34A] font-black">
                  <CheckCircle2 size={14} />
                  <span>Next action ready: 10-minute sticks bundling activity</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
