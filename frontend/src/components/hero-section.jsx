"use client";

import React from "react";
import { Camera, Layers, Brain, Lightbulb, ChevronDown, Play, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export function HeroSection({ onTryDemoClick, onWatchVideoClick }) {
  const { t, language } = useLanguage();

  return (
    <section className="relative max-w-7xl mx-auto px-6 py-20 md:py-28 z-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* ─── LEFT COLUMN: TEXT ─── */}
        <div className="space-y-8 text-left animate-fade-in">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold shadow-sm border border-[rgba(20,184,166,0.15)] w-fit"
            style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}
          >
            <Sparkles size={12} className="text-primary animate-pulse" />
            <span>Designed for India's Classrooms</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-4">
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] font-heading text-[#0F172A]"
            >
              Every Worksheet Becomes a Learning Diagnosis
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-[#475569] font-medium max-w-lg">
              Kagaz AI helps teachers instantly identify learning gaps from handwritten worksheets.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={onTryDemoClick}
              className="btn btn-primary btn-lg shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:scale-105"
              style={{ minHeight: 48 }}
            >
              <Camera size={20} />
              <span>Try Demo</span>
            </button>
            <button
              onClick={onWatchVideoClick}
              className="btn btn-secondary btn-lg font-bold flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-md"
              style={{ minHeight: 48 }}
            >
              <Play size={16} className="fill-teal-600" />
              <span>Watch Video</span>
            </button>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: FLOW VISUAL ─── */}
        <div className="space-y-6 animate-slide-up lg:pl-8">
          <div className="relative space-y-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 border border-slate-200 shadow-xl max-w-md mx-auto">
            
            {/* Step 1: Worksheet */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Camera size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-[#0F172A]">Worksheet</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Handwritten Student Sheet</p>
              </div>
            </div>

            {/* ↓ Arrow */}
            <div className="flex justify-center my-1 text-slate-300">
              <ChevronDown size={20} />
            </div>

            {/* Step 2: OCR */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                <Layers size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-[#0F172A]">OCR</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Extract Written Answers</p>
              </div>
            </div>

            {/* ↓ Arrow */}
            <div className="flex justify-center my-1 text-slate-300">
              <ChevronDown size={20} />
            </div>

            {/* Step 3: AI Diagnosis */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
                <Brain size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-[#0F172A]">AI Diagnosis</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Detect Specific Misconceptions</p>
              </div>
            </div>

            {/* ↓ Arrow */}
            <div className="flex justify-center my-1 text-slate-300">
              <ChevronDown size={20} />
            </div>

            {/* Step 4: Teacher Insights */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Lightbulb size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-[#0F172A]">Teacher Insights</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Remedial Plans & Activities</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
