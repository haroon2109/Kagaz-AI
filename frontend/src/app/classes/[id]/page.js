"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import { cachedFetch } from "@/lib/learning-cache";
import {
  Users, Plus, ClipboardList, Layers, TrendingUp, RefreshCw,
  AlertTriangle, WifiOff, ArrowRight, UserSearch, Play
} from "lucide-react";

/**
 * CLASS DETAIL — "Where is my class?" Class Learning Map.
 * Competency × status table with simple visual indicators: a teacher should
 * understand the class situation in under 10 seconds. No excessive charts.
 */



export default function ClassDetailPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState("");
  const [rebuilding, setRebuilding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await cachedFetch(() => api.learning.getClass(id), `class_${id}`);
    if (res.data) {
      setData(res.data);
      setFromCache(res.fromCache);
    } else {
      setError("Could not load this class.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const rebuild = async () => {
    setRebuilding(true);
    try {
      await api.learning.rebuildGroups(id);
      await load();
    } catch (err) {
      setError("Could not rebuild groups: " + err.message);
    } finally {
      setRebuilding(false);
    }
  };

  if (authLoading || (loading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }} />
      </div>
    );
  }
  if (!user) return null;
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="card p-8 text-center space-y-3">
          <p className="font-bold">{error || "Class not found"}</p>
          <Link href="/classes" className="btn btn-primary btn-sm">← Back to Classes</Link>
        </div>
      </div>
    );
  }

  const map = data.map || {};
  const rows = map.rows || [];
  const students = data.students || [];

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="page-header">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Link href="/classes" className="text-sm font-bold text-slate-400 hover:text-teal-700 cursor-pointer">Classes</Link>
                <span className="text-slate-300">/</span>
                <h1 className="text-xl font-extrabold">{data.name}</h1>
                {data.is_demo && <span className="chip chip-info text-[10px]">DEMO</span>}
              </div>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">
                {[data.grade, data.subject === "mathematics" ? "Mathematics" : "Literacy", `${data.student_count} students`, data.classroom_type === "multi_grade" ? "Multi-grade" : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/today" className="btn btn-secondary btn-sm font-bold cursor-pointer">
                <Play size={14} /><span>Today's Action</span>
              </Link>
              <Link href={`/assess?class=${id}`} className="btn btn-primary btn-sm font-bold cursor-pointer">
                <ClipboardList size={14} /><span>New Assessment</span>
              </Link>
              <Link href={`/groups?class=${id}`} className="btn btn-ghost btn-sm font-bold cursor-pointer">
                <Layers size={14} /><span>Groups</span>
              </Link>
              <Link href="/progress" className="btn btn-ghost btn-sm font-bold cursor-pointer">
                <TrendingUp size={14} /><span>Progress</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
          {error && (
            <div className="alert alert-error"><AlertTriangle size={18} className="flex-shrink-0" /><span>{error}</span></div>
          )}
          {fromCache && (
            <div className="alert alert-warning"><WifiOff size={18} className="flex-shrink-0" /><span>Showing saved data (offline).</span></div>
          )}

          {/* ── CLASS LEARNING MAP ── */}
          <section className="space-y-4">
            <div className="flex items-end justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Where is my class?</h2>
                <p className="text-sm font-semibold text-slate-500 mt-0.5">
                  {map.students_assessed} of {map.students_total} students assessed
                  {map.not_yet_assessed > 0 ? ` · ${map.not_yet_assessed} not yet assessed` : ""}
                </p>
              </div>
              <button onClick={rebuild} disabled={rebuilding} className="btn btn-ghost btn-sm font-bold cursor-pointer">
                <RefreshCw size={13} className={rebuilding ? "animate-spin" : ""} />
                <span>Rebuild groups</span>
              </button>
            </div>

            {map.headline && (
              <div className="alert alert-teal">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <span className="font-bold">{map.headline}</span>
              </div>
            )}

            <div className="card overflow-hidden">
              {rows.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <UserSearch className="mx-auto text-slate-300" size={36} />
                  <p className="font-bold text-slate-700">No assessment data yet</p>
                  <p className="text-sm text-slate-500 font-medium">Run a quick assessment and scan the papers to see the class learning map.</p>
                  <Link href={`/assess?class=${id}`} className="btn btn-primary btn-sm font-bold cursor-pointer">
                    <ClipboardList size={14} /><span>Create Quick Assessment</span>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Competency</th>
                        <th>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--success)" }} /> Demonstrated
                          </span>
                        </th>
                        <th>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--warning)" }} /> Developing
                          </span>
                        </th>
                        <th>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--error)" }} /> Needs support
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.competency_id}>
                          <td className="font-bold text-slate-800">{r.label}</td>
                          <td>
                            {r.demonstrated + r.developing + r.needs_support === 0 ? <span className="text-xs text-slate-400 font-semibold">—</span> : (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-bold" style={{ color: "var(--success-text)" }}>{r.demonstrated}</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {r.demonstrated + r.developing + r.needs_support === 0 ? <span className="text-xs text-slate-400 font-semibold">—</span> : (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-bold" style={{ color: "var(--warning-text)" }}>{r.developing}</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {r.demonstrated + r.developing + r.needs_support === 0 ? <span className="text-xs text-slate-400 font-semibold">—</span> : (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-bold" style={{ color: "var(--error-text)" }}>{r.needs_support}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Counts are per competency, based on each student's most recent scanned work. Simple indicators, no marks.
            </p>
          </section>

          {/* ── STUDENTS ── */}
          <section className="space-y-4">
            <h2 className="section-title mb-0">Students</h2>
            <div className="card p-2">
              {students.length === 0 ? (
                <p className="text-sm text-slate-500 font-medium p-6 text-center">No students yet. Add students when creating a class, or paste a roster from the edit screen later.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                  {students.map((s) => (
                    <Link
                      key={s.id}
                      href={`/students/${s.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--primary-light)] transition-all no-underline group"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "var(--primary)" }}>
                        {(s.name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                        {s.roll_no && <p className="text-[11px] font-semibold text-slate-400">Roll {s.roll_no}</p>}
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-teal-700 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
