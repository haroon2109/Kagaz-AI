"use client";

import React from "react";
import { Camera, Play, Sparkles, FileText, CheckCircle2, Brain } from "lucide-react";

export function HeroSection({ onTryDemoClick, onWatchVideoClick }) {
  return (
    <section className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 z-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* ─── LEFT COLUMN: TEXT ─── */}
        <div className="space-y-8 text-left animate-fade-in">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold shadow-sm border border-blue-500/30 w-fit"
            style={{ background: "rgba(37, 99, 235, 0.1)", color: "#3B82F6" }}
          >
            <Sparkles size={12} className="text-[#2563EB] animate-pulse" />
            <span>Designed for India's Classrooms</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-6">
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] font-heading text-white"
            >
              Automate <span className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent">Paperwork</span> with AI
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-slate-400 font-medium max-w-lg">
              Convert student voice notes, handwritten worksheets, PDFs, and notebook scans into structured pedagogical records instantly.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={onTryDemoClick}
              className="btn btn-primary btn-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 font-bold flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:scale-[1.03] active:scale-[0.98]"
              style={{ minHeight: 48, background: "#2563EB", border: "none", color: "#ffffff" }}
            >
              <Camera size={20} />
              <span>Try Demo</span>
            </button>
            <button
              onClick={onWatchVideoClick}
              className="btn btn-secondary btn-lg font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700/60 hover:bg-slate-900 text-slate-300 hover:text-white"
              style={{ minHeight: 48, background: "rgba(255,255,255,0.03)" }}
            >
              <Play size={16} className="fill-purple-500 text-purple-500" />
              <span>Watch 2-Min Demo</span>
            </button>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: INTERACTIVE DASHBOARD MOCKUP ─── */}
        <div className="relative animate-slide-up lg:pl-8">
          {/* Decorative glowing gradient background */}
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 blur-xl z-0" />
          
          {/* Mockup wrapper */}
          <div className="relative z-10 bg-slate-950/70 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-2xl max-w-md mx-auto overflow-hidden">
            {/* Header controls */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-4">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="text-[10px] text-slate-600 font-mono">analysis_dashboard.json</span>
              <div className="w-4 h-4 rounded bg-slate-900" />
            </div>

            {/* Simulated OCR File Card */}
            <div className="space-y-4">
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">subtraction_worksheet_borrowing.png</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Scanned Page • 1.4 MB</p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] font-bold">Processed</span>
              </div>

              {/* Simulated Live OCR Scanning Indicator */}
              <div className="relative p-4 bg-slate-900/30 rounded-xl border border-slate-900 space-y-3 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-semibold">OCR Numeral Detection</span>
                  <span className="text-blue-400 font-bold">98.4% Confidence</span>
                </div>
                <div className="font-mono text-[11px] text-slate-300 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-900/50">
                  <p className="text-slate-500">&gt; Scanning inputs...</p>
                  <p className="text-emerald-400">&gt; Question 1: 52 - 18 = <span className="font-bold underline">44</span></p>
                  <p className="text-[#7C3AED]">&gt; Analysis: Unit Borrowing Missed</p>
                </div>
              </div>

              {/* Pedagogical Gaps Feedback Panel */}
              <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-900/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Brain size={14} className="text-purple-400" />
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Concept Diagnosis</span>
                </div>
                <p className="text-xs font-bold text-slate-200">Teacher Remedial Plan Ready</p>
                <div className="flex items-center gap-1.5 text-[9px] text-[#22C55E] font-bold">
                  <CheckCircle2 size={12} />
                  <span>Number Line borrowing visual exercises loaded</span>
                </div>
              </div>
            </div>

            {/* Floating branding paper fold decorations */}
            <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-slate-900 border-l border-t border-slate-800 transform rotate-45 pointer-events-none opacity-30" />
          </div>
        </div>

      </div>
    </section>
  );
}
