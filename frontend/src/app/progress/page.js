"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import { cachedFetch } from "@/lib/learning-cache";
import {
  TrendingUp, Users, ArrowRight, AlertTriangle, Info,
} from "lucide-react";

/**
 * PROGRESS — class learning progression over time: counts of students at each
 * competency status before → after interventions. Deliberately honest framing:
 * "demonstrated improvement after the activity", never causal claims.
 */

export default function ProgressPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [classes, setClasses] = useState([]);
  const [classId, classIdState] = useState("");
  const [progress, setProgress] = useState(null);
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setClassId = classIdState;

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const cls = await api.learning.listClasses();
        setClasses(cls || []);
        if (cls && cls[0]) setClassId(cls[0].id);
      } catch {
        setError("Could not load classes.");
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      setLoading(true);
      const [p, m] = await Promise.all([
        cachedFetch(() => api.learning.getProgress(classId), `progress_${classId}`),
        cachedFetch(() => api.learning.getClassMap(classId), `classmap_${classId}`),
      ]);
      setProgress(p.data);
      setMap(m.data);
      setLoading(false);
    })();
  }, [classId]);

  if (authLoading || (loading && !progress && !map)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }} />
      </div>
    );
  }
  if (!user) return null;

  const timeline = progress?.timeline || [];
  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="page-header">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight">Progress</h1>
              <p className="text-sm mt-0.5 text-slate-500">Class learning progression — before → after</p>
            </div>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input input-sm max-w-[220px] font-semibold">
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_demo ? " ★" : ""}</option>)}
            </select>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
          {error && <div className="alert alert-error"><AlertTriangle size={18} className="flex-shrink-0" /><span>{error}</span></div>}

          {/* Before / After / Current */}
          {timeline.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900">Where the class moved</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="card p-5 space-y-1.5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Before intervention</p>
                  <p className="text-2xl font-black" style={{ color: "var(--error-text)" }}>{first?.needs_support ?? 0}</p>
                  <p className="text-sm font-semibold text-slate-500">competency records needing support</p>
                </div>
                <div className="hidden md:flex justify-center">
                  <ArrowRight size={28} className="text-slate-300" />
                </div>
                <div className="card p-5 space-y-1.5 md:col-span-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Current status</p>
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <span className="text-2xl font-black flex items-baseline gap-1" style={{ color: "var(--error-text)" }}>
                      {last?.needs_support ?? 0}
                      {first && (last.needs_support < first.needs_support) && <span className="text-sm text-emerald-500 font-extrabold">↓{first.needs_support - last.needs_support}</span>}
                      <span className="text-xs font-bold text-slate-500">need support</span>
                    </span>
                    <span className="text-2xl font-black flex items-baseline gap-1" style={{ color: "var(--warning-text)" }}>
                      {last?.developing ?? 0}
                      <span className="text-xs font-bold text-slate-500">developing</span>
                    </span>
                    <span className="text-2xl font-black flex items-baseline gap-1" style={{ color: "var(--success-text)" }}>
                      {last?.demonstrated ?? 0}
                      {first && (last.demonstrated > first.demonstrated) && <span className="text-sm text-emerald-500 font-extrabold">↑{last.demonstrated - first.demonstrated}</span>}
                      <span className="text-xs font-bold text-slate-500">demonstrated</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Simple day-by-day bar list (no excessive charts) */}
              <div className="card p-5 space-y-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Over time</p>
                {timeline.slice(-10).map((t) => {
                  const total = (t.demonstrated || 0) + (t.developing || 0) + (t.needs_support || 0) || 1;
                  return (
                    <div key={t.date} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{t.demonstrated} ✓ · {t.developing} ◐ · {t.needs_support} ○</span>
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                        <div style={{ width: `${((t.demonstrated || 0) / total) * 100}%`, background: "var(--success)" }} />
                        <div style={{ width: `${((t.developing || 0) / total) * 100}%`, background: "var(--warning)" }} />
                        <div style={{ width: `${((t.needs_support || 0) / total) * 100}%`, background: "var(--error)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="alert alert-info">
                <Info size={18} className="flex-shrink-0" />
                <span className="text-sm font-medium">
                  This shows observed change in competency evidence after activities — not a claim that Kagaz caused the change.
                </span>
              </div>
            </section>
          ) : (
            <div className="card p-10 text-center space-y-3 max-w-lg mx-auto">
              <TrendingUp className="mx-auto text-slate-300" size={40} />
              <h2 className="text-lg font-extrabold text-slate-900">No progress data yet</h2>
              <p className="text-sm text-slate-600 font-medium">After the first assessment and a reassessment, you'll see how the class moved.</p>
              <Link href={`/assess?class=${classId}`} className="btn btn-primary btn-sm font-bold cursor-pointer">Start assessing</Link>
            </div>
          )}

          {/* Current class map summary + student links */}
          {map && map.rows?.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="section-title mb-0">Current competencies</h2>
                <Link href={`/classes/${classId}`} className="text-sm font-bold text-teal-700 hover:underline cursor-pointer">Full class map →</Link>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Competency</th><th>Demonstrated</th><th>Developing</th><th>Needs support</th></tr></thead>
                    <tbody>
                      {map.rows.map((r) => (
                        <tr key={r.competency_id}>
                          <td className="font-bold text-slate-800">{r.label}</td>
                          <td className="font-bold" style={{ color: "var(--success-text)" }}>{r.demonstrated}</td>
                          <td className="font-bold" style={{ color: "var(--warning-text)" }}>{r.developing}</td>
                          <td className="font-bold" style={{ color: "var(--error-text)" }}>{r.needs_support}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Evaluation / pilot section */}
          <EvaluationSection />
        </div>
      </main>
    </div>
  );
}

function EvaluationSection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.learning.evaluationExport();
        setData(d);
      } catch {}
    })();
  }, []);

  return (
    <section className="space-y-3">
      <h2 className="section-title mb-0">Pilot / evaluation</h2>
      <div className="card p-5 space-y-2">
        {data && data.total > 0 ? (
          <>
            <p className="text-sm font-bold text-slate-800">
              Teacher–AI agreement: {data.agreement_count}/{data.total} predictions confirmed
              {data.agreement_rate != null ? ` (${Math.round(data.agreement_rate * 100)}%)` : ""}
            </p>
            <p className="text-xs font-medium text-slate-500">
              Measured from teacher confirm/edit/verify feedback on AI inferences. Real metrics from real classrooms — no invented numbers.
            </p>
          </>
        ) : (
          <p className="text-sm font-medium text-slate-500">
            When teachers confirm or correct AI findings, agreement metrics appear here. No fabricated accuracy claims.
          </p>
        )}
      </div>
    </section>
  );
}
