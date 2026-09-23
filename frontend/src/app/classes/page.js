"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import { cacheSet, cacheGet } from "@/lib/learning-cache";
import { Users, Plus, ChevronRight, Sparkles, Loader2, AlertTriangle } from "lucide-react";

/**
 * CLASSES — list + create. Minimal data entry: paste a roster, one name per
 * line. Multi-grade classes group by demonstrated competency, not by grade.
 */

export default function ClassesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [demoBusy, setDemoBusy] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("Grade 3");
  const [subject, setSubject] = useState("mathematics");
  const [language, setLanguage] = useState("");
  const [multiGrade, setMultiGrade] = useState(false);
  const [rosterText, setRosterText] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.learning.listClasses();
      setClasses(list || []);
      cacheSet("classes", list || []);
    } catch {
      const cached = cacheGet("classes");
      if (cached) setClasses(cached);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    const names = rosterText.split("\n").map((n) => n.trim()).filter(Boolean);
    if (!name.trim()) {
      setError("Please give the class a name.");
      return;
    }
    setCreating(true);
    try {
      // Multi-grade: each roster line may carry a grade after a comma
      // ("Aarav, Grade 2") so groups can show each child's grade.
      const split = names.map((line) => {
        const m = line.split(",");
        return { name: (m[0] || "").trim(), grade: (m[1] || "").trim() || null };
      });
      await api.learning.createClass({
        name: name.trim(),
        grade,
        subject,
        language: language || null,
        classroom_type: multiGrade ? "multi_grade" : "single_grade",
        student_names: split.map((s) => s.name),
        student_grades: split.map((s) => s.grade),
      });
      setName(""); setRosterText(""); setShowForm(false);
      await load();
    } catch (err) {
      setError("Could not create class: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const startDemo = async () => {
    setDemoBusy(true);
    setError("");
    try {
      await api.learning.demoSetup();
      await load();
    } catch (err) {
      setError("Demo setup failed: " + err.message);
    } finally {
      setDemoBusy(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }} />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="page-header">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight">Classes</h1>
              <p className="text-sm mt-0.5 text-slate-500">Your classes and students</p>
            </div>
            <button onClick={() => setShowForm((s) => !s)} className="btn btn-primary btn-sm font-bold cursor-pointer">
              <Plus size={14} />
              <span>New Class</span>
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
          {error && (
            <div className="alert alert-error">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <form onSubmit={handleCreate} className="card p-6 md:p-8 space-y-5 animate-slide-up">
              <h2 className="text-lg font-extrabold text-slate-900">Create a class</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Class name *</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class 3B" />
                </div>
                <div>
                  <label className="field-label">Grade</label>
                  <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
                    {["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Nursery–5 (multi)"].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Subject focus</label>
                  <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option value="mathematics">Mathematics</option>
                    <option value="literacy">Literacy</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Language (optional)</label>
                  <input className="input" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. English, Hindi" />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={multiGrade} onChange={(e) => setMultiGrade(e.target.checked)} className="w-4 h-4 accent-teal-700" />
                <span className="text-sm font-semibold text-slate-700">
                  Multi-grade classroom
                  <span className="block text-xs font-medium text-slate-500">
                    Students will be grouped by demonstrated competency, not by grade.
                  </span>
                </span>
              </label>

              <div>
                <label className="field-label">
                  Students — paste names, one per line <span className="font-normal text-slate-400">(or add later)</span>
                </label>
                <textarea
                  className="input font-mono text-sm"
                  rows={5}
                  value={rosterText}
                  onChange={(e) => setRosterText(e.target.value)}
                  placeholder={multiGrade ? "Aarav, Grade 2\nBhavna, Grade 3\nChirag, Grade 2\nDiya, Grade 4" : "Aarav\nBhavna\nChirag\nDiya"}
                />
                {multiGrade && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Multi-grade: add each student's grade after a comma, e.g. <code className="font-mono">Aarav, Grade 2</code>
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={creating} className="btn btn-primary font-bold cursor-pointer">
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                  <span>{creating ? "Creating…" : "Create Class"}</span>
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost font-bold cursor-pointer">Cancel</button>
              </div>
            </form>
          )}

          {/* Class list */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => <div key={i} className="card h-32 animate-pulse" />)}
            </div>
          ) : classes.length === 0 ? (
            <div className="card p-10 text-center space-y-5 max-w-lg mx-auto">
              <div className="text-5xl">🏫</div>
              <h2 className="text-xl font-extrabold text-slate-900">No classes yet</h2>
              <p className="text-sm text-slate-600 font-medium">Create a class to get started, or explore with the sample class.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => setShowForm(true)} className="btn btn-primary font-bold cursor-pointer">
                  <Plus size={16} /><span>Create Class</span>
                </button>
                <button onClick={startDemo} disabled={demoBusy} className="btn btn-secondary font-bold cursor-pointer">
                  <Sparkles size={16} /><span>{demoBusy ? "Preparing…" : "Try Demo Class"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((c) => (
                <Link key={c.id} href={`/classes/${c.id}`} className="card card-hover p-6 flex items-center justify-between no-underline group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                      <Users size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 truncate">
                        {c.name} {c.is_demo && <span className="chip chip-info text-[10px] ml-1">DEMO</span>}
                      </p>
                      <p className="text-sm font-semibold text-slate-500 truncate">
                        {[c.grade, c.subject === "mathematics" ? "Mathematics" : "Literacy", `${c.student_count} students`].filter(Boolean).join(" · ")}
                        {c.classroom_type === "multi_grade" ? " · Multi-grade" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-teal-700 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
