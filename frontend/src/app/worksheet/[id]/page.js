"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function WorksheetDetail({ params }) {
  const { id } = params;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [worksheet, setWorksheet] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  
  // Form States
  const [title, setTitle] = useState("");
  const [studentName, setStudentName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadWorksheetDetails();
    }
  }, [user, id]);

  const loadWorksheetDetails = async () => {
    setLoadingData(true);
    setError("");
    try {
      const data = await api.worksheets.get(id);
      setWorksheet(data);
      setTitle(data.title || "");
      
      // Load student relation if exists
      if (data.student) {
        setStudentName(data.student.name || "");
        setRollNo(data.student.roll_no || "");
      } else {
        setStudentName("");
        setRollNo("");
      }
      
      setItems(data.items || []);
    } catch (err) {
      console.error("Failed to load worksheet details:", err);
      setError("Failed to fetch worksheet details from server.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleItemValueChange = (itemId, field, value) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(updated);
  };

  const handleStatusToggle = (itemId, statusValue) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        return { ...item, is_correct: statusValue };
      }
      return item;
    });
    setItems(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    
    const payload = {
      title,
      student_name: studentName,
      roll_no: rollNo,
      items: items.map(it => ({
        id: it.id,
        student_answer: it.student_answer,
        correct_answer: it.correct_answer,
        is_correct: it.is_correct
      }))
    };

    try {
      const updated = await api.worksheets.update(id, payload);
      setWorksheet(updated);
      setItems(updated.items || []);
      alert("Worksheet re-graded successfully with updated AI feedback!");
    } catch (err) {
      console.error("Update failed:", err);
      setError("Failed to submit corrections. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex bg-slate-50 min-h-[calc(100vh-64px)] justify-center items-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-light">Loading worksheet details...</p>
        </div>
      </div>
    );
  }

  if (!worksheet) {
    return (
      <div className="flex bg-slate-50 min-h-[calc(100vh-64px)] justify-center items-center">
        <p className="text-red-500">Worksheet not found.</p>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-hidden">
        
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
          <span>&gt;</span>
          <span className="text-slate-700 font-medium">Worksheet Review</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{worksheet.title}</h1>
            <p className="text-slate-500">Review OCR transcriptions and AI grading results.</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-200 hover:bg-slate-100 rounded-xl">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-light">
            {error}
          </div>
        )}

        {/* Split Screen Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Pane: Scan Image Preview */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-white border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 p-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Original Scan Preview</CardTitle>
              </CardHeader>
              <div className="p-4 flex items-center justify-center bg-slate-950 min-h-[400px] max-h-[600px] overflow-y-auto">
                {worksheet.image_url ? (
                  <img
                    src={worksheet.image_url}
                    alt="Worksheet original scan"
                    className="max-w-full h-auto object-contain rounded-lg border border-slate-800"
                  />
                ) : (
                  <span className="text-slate-600 text-xs">No scan image available</span>
                )}
              </div>
            </Card>

            {/* AI Insights Summary Card (shows if completed) */}
            {worksheet.status === "completed" && worksheet.ai_feedback && (
              <Card className="bg-white border shadow-sm rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">AI Grading Summary</h3>
                
                {/* Feedback */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Student Feedback</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 border rounded-xl p-3.5 italic">
                    "{worksheet.ai_feedback.feedback}"
                  </p>
                </div>

                {/* Gaps */}
                {worksheet.ai_feedback.learning_gaps && worksheet.ai_feedback.learning_gaps.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Diagnosed Gaps</h4>
                    <div className="space-y-2">
                      {worksheet.ai_feedback.learning_gaps.map((gap, i) => (
                        <div key={i} className="text-sm border-l-2 border-indigo-500 pl-3 py-0.5">
                          <strong className="text-slate-800 block">{gap.concept}</strong>
                          <span className="text-slate-500 text-xs">{gap.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {worksheet.ai_feedback.remedial_suggestions && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Remedial Action plan</h4>
                    <p className="text-sm text-slate-600">{worksheet.ai_feedback.remedial_suggestions}</p>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Right Pane: Correction Editor Form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSave} className="space-y-6">
              <Card className="bg-white border shadow-sm rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h3 className="text-lg font-bold text-slate-800">OCR & Grade Verification</h3>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                    Grade Score: {worksheet.final_score !== null ? `${Math.round(worksheet.final_score)}%` : "—"}
                  </span>
                </div>

                {/* Student Details Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Student Name</label>
                    <Input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Aarav Shah"
                      className="border-slate-200 focus-visible:ring-indigo-600 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Roll Number</label>
                    <Input
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      placeholder="e.g. 12"
                      className="border-slate-200 focus-visible:ring-indigo-600 rounded-xl"
                    />
                  </div>
                </div>

                {/* Worksheet Items List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700">Questions Transcripts</h4>
                  {items.length === 0 ? (
                    <p className="text-slate-400 text-xs italic">No questions recognized from OCR scan.</p>
                  ) : (
                    items.map((item, idx) => (
                      <Card key={item.id} className="border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-4 shadow-none">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 mr-2">
                              Q{item.question_no}
                            </span>
                            <span className="text-sm font-medium text-slate-800">{item.question_text || "Recognized Question"}</span>
                          </div>
                          
                          {/* Grade Toggle override buttons */}
                          <div className="flex border rounded-lg overflow-hidden h-7">
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(item.id, "correct")}
                              className={`px-3.5 text-xs font-bold transition-colors ${
                                item.is_correct === "correct"
                                  ? "bg-emerald-500 text-white"
                                  : "bg-white text-slate-400 hover:bg-slate-100"
                              }`}
                            >
                              Correct
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(item.id, "incorrect")}
                              className={`px-3.5 text-xs font-bold transition-colors ${
                                item.is_correct === "incorrect"
                                  ? "bg-red-500 text-white"
                                  : "bg-white text-slate-400 hover:bg-slate-100"
                              }`}
                            >
                              Incorrect
                            </button>
                          </div>
                        </div>

                        {/* Answers inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Extracted Answer (OCR)</label>
                            <Input
                              value={item.student_answer || ""}
                              onChange={(e) => handleItemValueChange(item.id, "student_answer", e.target.value)}
                              className="h-8 text-xs border-slate-200 focus-visible:ring-indigo-600 rounded-lg bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Expected Correct Answer</label>
                            <Input
                              value={item.correct_answer || ""}
                              onChange={(e) => handleItemValueChange(item.id, "correct_answer", e.target.value)}
                              className="h-8 text-xs border-slate-200 focus-visible:ring-indigo-600 rounded-lg bg-white"
                            />
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>

                <div className="border-t pt-4 flex justify-between items-center">
                  <div className="space-x-2">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Worksheet Title"
                      className="w-56 h-9 inline-block border-slate-200 focus-visible:ring-indigo-600 rounded-xl"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-xl py-5 px-6 font-semibold"
                  >
                    {submitting ? "Analyzing..." : "Save & Re-Grade"}
                  </Button>
                </div>
              </Card>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
