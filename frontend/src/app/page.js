import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-20 text-white">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-[128px]" />
      <div className="absolute bottom-1/4 left-1/3 -z-10 h-96 w-96 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-[128px]" />

      <main className="max-w-4xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-sm font-medium text-slate-300 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          Simplifying grading for 10,000+ classrooms
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          Empowering Teachers with <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI-Driven Evaluation
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
          Kagaz AI transforms hand-written student worksheets into deep learning analytics instantly. Grade faster, pinpoint learning gaps, and support every student.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link href="/dashboard">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 rounded-xl px-8 py-6 text-base">
              Enter Teacher Dashboard
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-900 hover:text-white rounded-xl px-8 py-6 text-base backdrop-blur-md">
            Learn More
          </Button>
        </div>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-5xl mx-auto">
          {[
            {
              title: "Instant OCR Scan",
              desc: "Upload a photo of any handwritten worksheet. Our pipeline identifies handwriting, layout, and questions immediately.",
            },
            {
              title: "AI-Powered Analysis",
              desc: "Assess concepts automatically. Generates precise report cards with actionable remedial feedback.",
            },
            {
              title: "Offline Sync Support",
              desc: "Designed for rural schools. Capture work offline and auto-sync grading tasks whenever connectivity is restored.",
            },
          ].map((feat, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md text-left space-y-3 hover:border-slate-700 transition-all duration-300 group"
            >
              <h3 className="font-semibold text-lg text-white group-hover:text-indigo-400 transition-colors">
                {feat.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
