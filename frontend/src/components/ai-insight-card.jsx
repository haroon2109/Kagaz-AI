"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

export function AIInsightCard({ 
  concept, 
  affectedStudents, 
  confidence, 
  recommendation, 
  language = "en" 
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-orange-200/60 shadow-md hover:shadow-lg transition-all overflow-hidden relative">
      {/* Decorative background gradient */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-400/8 to-transparent rounded-full pointer-events-none" />
      
      {/* Orange accent left border */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 via-orange-400 to-transparent" />

      <div className="relative z-10 space-y-4">
        {/* Header with icon and title */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0 mt-0.5">
            <AlertCircle size={20} className="stroke-[2]" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900 leading-tight">
            {concept}
          </h3>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Affected Students */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === "hi" ? "प्रभावित छात्र" : "Affected Students"}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {affectedStudents}%
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {language === "hi" ? "कक्षा" : "of class"}
              </span>
            </div>
            {/* Visual bar */}
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                style={{ width: `${affectedStudents}%` }}
              />
            </div>
          </div>

          {/* Confidence */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === "hi" ? "विश्वास" : "Confidence"}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {confidence}%
              </span>
            </div>
            {/* Confidence badge */}
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-700">
                {language === "hi" ? "अत्यधिक सटीक" : "High Accuracy"}
              </span>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {language === "hi" ? "अनुशंसा" : "Recommendation"}
          </p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50/60 border border-orange-100">
            <span className="text-base">💡</span>
            <p className="text-sm font-semibold text-slate-800">
              {recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
