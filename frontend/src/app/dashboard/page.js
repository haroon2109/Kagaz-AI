"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [worksheets, setWorksheets] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoadingData(true);
    setError("");
    try {
      const [wsList, studentList] = await Promise.all([
        api.worksheets.list(),
        api.students.list()
      ]);
      setWorksheets(wsList || []);
      setStudents(studentList || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to sync dashboard data with server. Displaying cached view.");
    } finally {
      setLoadingData(false);
    }
  };

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] justify-center items-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-light">Checking credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // --- Calculations & Aggregations ---

  // 1. Processed Worksheets
  const completedSheets = worksheets.filter(w => w.status === "completed");
  const processedCount = completedSheets.length;
  const totalCount = worksheets.length;

  // 2. Class Average
  const totalScores = completedSheets.reduce((sum, w) => sum + (w.final_score || 0), 0);
  const classAverage = processedCount > 0 ? Math.round(totalScores / processedCount) : null;

  // 3. Learning Gaps & Weak Concepts Aggregation
  const conceptFrequency = {};
  completedSheets.forEach(w => {
    if (w.ai_feedback && Array.isArray(w.ai_feedback.learning_gaps)) {
      w.ai_feedback.learning_gaps.forEach(gap => {
        const concept = gap.concept || "General Review";
        conceptFrequency[concept] = (conceptFrequency[concept] || 0) + 1;
      });
    }
  });

  const sortedGaps = Object.entries(conceptFrequency)
    .map(([concept, count]) => ({ concept, count }))
    .sort((a, b) => b.count - a.count);

  const weakestConcept = sortedGaps.length > 0 ? sortedGaps[0].concept : "None Detected";

  // 4. Student Roster Performance Averages
  const studentPerformance = students.map(student => {
    const studentSheets = completedSheets.filter(w => w.student_id === student.id);
    const sum = studentSheets.reduce((acc, w) => acc + (w.final_score || 0), 0);
    const avg = studentSheets.length > 0 ? Math.round(sum / studentSheets.length) : null;
    return {
      ...student,
      sheetsCount: studentSheets.length,
      averageScore: avg
    };
  });

  return (
    <div className="flex bg-slate-50 min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Teacher Dashboard</h1>
            <p className="text-slate-500">Real-time educational feedback and worksheet performance metrics.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/batch">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-xl px-5 py-2.5 transition-colors">
                Batch Capture Worksheets
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-light">
            {error}
          </div>
        )}

        {/* Loading overlay for data sync */}
        {loadingData ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 text-sm font-light">Fetching database records...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { title: "Processed Worksheets", value: `${processedCount}/${totalCount}`, desc: "Grading pipelines completed" },
                { title: "Class Average", value: classAverage !== null ? `${classAverage}%` : "N/A", desc: "Average grading score" },
                { title: "Active Roster", value: `${students.length} Students`, desc: "Registered student counts" },
                { title: "Weakest Concept", value: weakestConcept, desc: "Most recurring learning gap" },
              ].map((stat, idx) => (
                <Card key={idx} className="bg-white border border-slate-100 shadow-sm rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase font-semibold text-slate-400">
                      {stat.title}
                    </CardDescription>
                    <CardTitle className="text-2xl font-extrabold text-slate-800 tracking-tight truncate">
                      {stat.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500">{stat.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Recent Worksheets Table */}
              <Card className="lg:col-span-2 bg-white border border-slate-100 shadow-sm rounded-2xl flex flex-col justify-between min-h-[450px]">
                <div>
                  <CardHeader className="border-b pb-4">
                    <CardTitle className="text-lg font-bold text-slate-800">Recent Graded Worksheets</CardTitle>
                    <CardDescription>A list of worksheets submitted for OCR evaluation.</CardDescription>
                  </CardHeader>
                  
                  <div className="overflow-x-auto">
                    {worksheets.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 font-light text-sm">
                        No worksheets submitted. Click "Batch Capture Worksheets" to start.
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b bg-slate-50/50 text-slate-400 font-semibold uppercase text-xs">
                            <th className="p-4">Worksheet Title</th>
                            <th className="p-4">Student</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Score</th>
                            <th className="p-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {worksheets.slice(0, 8).map((ws) => {
                            const student = students.find(s => s.id === ws.student_id);
                            return (
                              <tr key={ws.id} className="border-b hover:bg-slate-50/45 transition-colors">
                                <td className="p-4 font-semibold text-slate-800 truncate max-w-[150px]">{ws.title}</td>
                                <td className="p-4 text-slate-600">{student ? student.name : "(Unknown)"}</td>
                                <td className="p-4">
                                  {ws.status === "completed" && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                                      Graded
                                    </span>
                                  )}
                                  {ws.status === "processing" && (
                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-100 animate-pulse">
                                      Processing
                                    </span>
                                  )}
                                  {ws.status === "failed" && (
                                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-100">
                                      Failed
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-right font-bold text-slate-700">
                                  {ws.final_score !== null ? `${Math.round(ws.final_score)}%` : "—"}
                                </td>
                                <td className="p-4 text-center">
                                  <Link href={`/worksheet/${ws.id}`}>
                                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                      View Details
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                
                {worksheets.length > 8 && (
                  <CardContent className="border-t pt-4 text-center">
                    <span className="text-xs text-slate-400">Showing 8 most recent uploads.</span>
                  </CardContent>
                )}
              </Card>

              {/* Right Column: Analytics Sidebar */}
              <div className="space-y-6">
                
                {/* 1. Learning Gaps List */}
                <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-3">Top Learning Gaps</h3>
                  <p className="text-xs text-slate-400 mb-4">Concepts with recurring errors across graded papers.</p>
                  
                  {sortedGaps.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 font-light text-sm">
                      No learning gaps recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {sortedGaps.slice(0, 4).map((gap, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50/50 border rounded-xl p-3">
                          <span className="text-sm font-semibold text-slate-700 truncate max-w-[180px]">{gap.concept}</span>
                          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-100">
                            {gap.count} students
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* 2. Roster Performance */}
                <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-3">Student Performance</h3>
                  <p className="text-xs text-slate-400 mb-4"> Roster averages calculated from graded worksheets.</p>

                  {studentPerformance.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 font-light text-sm">
                      No students registered.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentPerformance.slice(0, 5).map((student, i) => (
                        <div key={student.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                          <div>
                            <span className="font-semibold text-slate-700 block">{student.name}</span>
                            <span className="text-xs text-slate-400 font-light">Roll No: {student.roll_no || "N/A"} • {student.sheetsCount} sheets</span>
                          </div>
                          <span className={`font-bold px-2 py-0.5 text-xs rounded-lg ${
                            student.averageScore === null ? "bg-slate-100 text-slate-500" :
                            student.averageScore >= 80 ? "bg-emerald-50 text-emerald-700" :
                            student.averageScore >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                          }`}>
                            {student.averageScore !== null ? `${student.averageScore}%` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
