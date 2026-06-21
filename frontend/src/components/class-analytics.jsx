"use client";

import React from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";

export function ClassAnalytics({ 
  subjectBreakdown = [],
  weakConceptsData = [],
  language = "en"
}) {
  // Default data if not provided
  const defaultSubjects = [
    { name: language === "hi" ? "पढ़ना" : "Reading", value: 35, color: "#3b82f6" },
    { name: language === "hi" ? "गणित" : "Math", value: 42, color: "#0F766E" },
    { name: language === "hi" ? "लेखन" : "Writing", value: 23, color: "#8b5cf6" },
  ];

  const defaultWeakConcepts = [
    { concept: language === "hi" ? "घटाव उधार" : "Subtraction Borrowing", students: 18, fill: "#f97316" },
    { concept: language === "hi" ? "शब्द समस्या" : "Word Problems", students: 14, fill: "#f59e0b" },
    { concept: language === "hi" ? "गुणन सारणी" : "Multiplication Table", students: 12, fill: "#fbbf24" },
    { concept: language === "hi" ? "स्थान मान" : "Place Value", students: 10, fill: "#fcd34d" },
    { concept: language === "hi" ? "भिन्न" : "Fractions", students: 8, fill: "#fde68a" },
  ];

  const subjects = subjectBreakdown.length > 0 ? subjectBreakdown : defaultSubjects;
  const weakConcepts = weakConceptsData.length > 0 ? weakConceptsData : defaultWeakConcepts;

  // Calculate total for percentage
  const subjectTotal = subjects.reduce((sum, s) => sum + s.value, 0);

  // Custom tooltip for donut
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = Math.round((data.value / subjectTotal) * 100);
      return (
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-md">
          <p className="text-sm font-bold text-slate-900">{data.name}</p>
          <p className="text-sm font-semibold text-slate-600">
            {percentage}% ({data.value})
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-md">
          <p className="text-sm font-bold text-slate-900">{data.concept}</p>
          <p className="text-sm font-semibold text-orange-600">
            {data.students} {language === "hi" ? "छात्र" : "students"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="space-y-8">
      <h2 className="text-lg font-extrabold text-slate-900">
        {language === "hi" ? "कक्षा विश्लेषण" : "Class Analytics"}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ═══ SUBJECT BREAKDOWN - DONUT CHART ═══ */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <div className="space-y-4 mb-6">
            <h3 className="text-base font-extrabold text-slate-900">
              {language === "hi" ? "विषय वितरण" : "Subject Distribution"}
            </h3>
            <p className="text-sm font-semibold text-slate-500">
              {language === "hi" 
                ? "सभी वर्कशीट में विषय का विभाजन"
                : "Distribution of subjects across all worksheets"
              }
            </p>
          </div>

          <div className="flex items-center justify-center h-80 relative">
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-slate-800">40</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {language === "hi" ? "उत्तर पत्र" : "Worksheets"}
              </span>
            </div>
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Pie
                  data={subjects}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={6}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {subjects.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100">
            {subjects.map((subject, idx) => {
              const percentage = Math.round((subject.value / subjectTotal) * 100);
              return (
                <div key={idx} className="text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="text-sm font-bold text-slate-700">
                      {subject.name}
                    </span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900">
                    {percentage}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ WEAK CONCEPTS - HORIZONTAL BAR CHART ═══ */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <div className="space-y-4 mb-6">
            <h3 className="text-base font-extrabold text-slate-900">
              {language === "hi" ? "कमजोर अवधारणाएं" : "Weak Concepts"}
            </h3>
            <p className="text-sm font-semibold text-slate-500">
              {language === "hi"
                ? "छात्रों को सबसे अधिक कठिनाई वाली अवधारणाएं"
                : "Concepts students struggle with most"
              }
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart
                data={weakConcepts}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis 
                  dataKey="concept" 
                  type="category"
                  stroke="#64748b"
                  width={140}
                  tick={{ fontSize: 12, fontWeight: 600, fill: "#334155" }}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar
                  dataKey="students"
                  fill="#f97316"
                  radius={[0, 8, 8, 0]}
                  animationDuration={600}
                >
                  {weakConcepts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary stats */}
          <div className="pt-4 border-t border-slate-100 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <BarChart3 size={16} className="text-orange-600" />
              <span className="font-semibold text-slate-700">
                {language === "hi" 
                  ? `कुल: ${weakConcepts.reduce((sum, c) => sum + c.students, 0)} छात्र प्रभावित`
                  : `Total: ${weakConcepts.reduce((sum, c) => sum + c.students, 0)} students affected`
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
