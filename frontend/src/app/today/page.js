"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import { cachedFetch } from "@/lib/learning-cache";
import {
  Users, ClipboardList, AlertTriangle, TrendingUp, Play, RefreshCw,
  ChevronRight, WifiOff, Layers, CheckCircle2, ArrowRight, Sparkles, Eye,
} from "lucide-react";
import { AiEngineChip } from "@/components/api-status-banner";

/**
 * TODAY WITH KAGAZ — teacher-first home screen.
 * Not an analytics dashboard: the first thing the teacher sees is
 * "What should I do today?" → start activity → reassess. The heart of Kagaz.
 */

function SnapshotChip({ icon: Icon, value, label, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, color }}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xl font-extrabold leading-none text-slate-900">{value}</p>
        <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function TodayPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState("");
  const [startingDemo, setStartingDemo] = useState(false);
  const [aiNarrative, setAiNarrative] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async (classId) => {
    setLoading(true);
    setError("");
    setAiNarrative(null); // avoid showing the previous class's note
    // Offline-first: fall back to cached copy when the network fails
    const res = await cachedFetch(
      () => api.learning.getToday(classId),
      `today_${classId}`
    );
    if (res.data) {
      setToday(res.data);
      setFromCache(res.fromCache);
      // AI insight arrives separately (fail-soft, own timeout) so a slow local
      // model never delays the plan. Silent on failure — the card simply stays hidden.
      api.learning
        .getTodayNarrative(classId)
        .then((r) => setAiNarrative(r?.data?.ai_narrative || null))
        .catch(() => setAiNarrative(null));
    } else {
      setError("Could not load today's action. Check your connection and retry.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const list = await api.learning.listClasses();
        setClasses(list || []);
        if (list && list.length > 0) {
          const preferred = list.find((c) => c.is_demo) || list[0];
          setSelectedClassId(preferred.id);
        }
      } catch {
        // No connectivity and no cached classes → show empty state
        setClasses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (selectedClassId) load(selectedClassId);
  }, [selectedClassId, load]);

  const startDemo = async () => {
    setStartingDemo(true);
    setError("");
    try {
      const res = await api.learning.demoSetup();
      const list = await api.learning.listClasses();
      setClasses(list || []);
      setSelectedClassId(res.class.id);
    } catch (err) {
      setError("Demo setup failed: " + err.message);
    } finally {
      setStartingDemo(false);
    }
  };

  if (authLoading || (loading && !today && !classes.length)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }} />
          <p className="text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const snapshot = today?.snapshot;
  const action = today?.action;
  const groups = today?.groups || [];
  const ai_narrative = aiNarrative; // LLM coaching note (null until fetched / when AI unavailable)

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Page header */}
        <div className="page-header">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight">Today with Kagaz</h1>
              <p className="text-sm mt-0.5 text-slate-500">
                {today ? `${today.class_name} — what should I do today?` : "What should I do today?"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {classes.length > 0 && (
                <select
                  value={selectedClassId || ""}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="input input-sm max-w-[220px] font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.is_demo ? " ★" : ""}
                    </option>
                  ))}
                </select>
              )}
              <Link href="/assess" className="btn btn-primary btn-sm font-bold cursor-pointer">
                <ClipboardList size={14} />
                <span>Scan Work</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
          {error && (
            <div className="alert alert-error">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => selectedClassId && load(selectedClassId)} className="underline font-bold cursor-pointer">Retry</button>
            </div>
          )}

          {fromCache && (
            <div className="alert alert-warning">
              <WifiOff size={18} className="flex-shrink-0" />
              <span>Showing saved data (offline). It will refresh when you reconnect.</span>
            </div>
          )}

          {/* ── Empty state: no classes yet ── */}
          {!loading && classes.length === 0 && (
            <div className="card p-10 text-center space-y-6 max-w-lg mx-auto">
              <div className="text-5xl">🏫</div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900">Create your first class</h2>
                <p className="text-sm text-slate-600 font-medium">
                  Add your class and students, run a quick foundational check, and Kagaz will tell you what to teach next.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/classes" className="btn btn-primary font-bold cursor-pointer">
                  <Users size={16} />
                  <span>Create Class</span>
                </Link>
                <button onClick={startDemo} disabled={startingDemo} className="btn btn-secondary font-bold cursor-pointer">
                  <Sparkles size={16} />
                  <span>{startingDemo ? "Preparing demo…" : "Try Demo Class"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Empty state: class exists, nobody assessed ── */}
          {!loading && classes.length > 0 && today && snapshot && (snapshot.students_assessed === 0 || snapshot.groups?.length === 0) && (
            <div className="card p-10 text-center space-y-6 max-w-lg mx-auto">
              <div className="text-5xl">📋</div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900">Run your first quick check</h2>
                <p className="text-sm text-slate-600 font-medium">
                  Print the short assessment, hand it out, then scan each paper. Kagaz maps every answer to foundational competencies.
                </p>
              </div>
              <Link href={`/assess?class=${selectedClassId}`} className="btn btn-primary font-bold cursor-pointer">
                <ClipboardList size={16} />
                <span>Create Quick Assessment</span>
              </Link>
            </div>
          )}

          {/* ── Main content ── */}
          {today && snapshot && snapshot.students_assessed > 0 && snapshot.groups?.length > 0 && (
            <>
              {/* CLASS SNAPSHOT */}
              <section className="space-y-4">
                <h2 className="section-title">Class snapshot</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SnapshotChip icon={Users} value={snapshot.students_assessed} label={`of ${snapshot.students_total} students assessed`} color="#0F766E" />
                  {(snapshot.needs_support_counts || []).slice(0, 2).map((n, i) => (
                    <SnapshotChip key={i} icon={AlertTriangle} value={n.count} label={`need support in ${n.label.toLowerCase()}`} color="#F59E0B" />
                  ))}
                  <SnapshotChip icon={TrendingUp} value={snapshot.ready_to_advance} label="ready to advance" color="#22C55E" />
                </div>
              </section>

              {/* AI INSIGHT — narration of the deterministic evidence (hidden if unavailable) */}
              {ai_narrative && (
                <section className="space-y-3">
                  <h2 className="section-title">AI insight</h2>
                  <div
                    className="card p-6 space-y-4"
                    style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.06), rgba(255,255,255,0.9))", borderColor: "rgba(20,184,166,0.3)", borderWidth: 1.5 }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Sparkles size={16} className="text-primary" />
                      <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
                        Coach note — generated from your class evidence
                      </span>
                      <AiEngineChip engine={ai_narrative.engine} />
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{ai_narrative.why_now}</p>
                    {ai_narrative.watch_fors?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Watch for during the activity</p>
                        <ul className="space-y-1.5">
                          {ai_narrative.watch_fors.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                              <Eye size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ai_narrative.say_this && (
                      <div className="p-3.5 rounded-xl" style={{ background: "rgba(20,184,166,0.08)", border: "1px dashed rgba(20,184,166,0.35)" }}>
                        <p className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-1">Say this to the group</p>
                        <p className="text-sm font-bold text-slate-800">“{ai_narrative.say_this}”</p>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 font-medium">{ai_narrative.disclaimer}</p>
                  </div>
                </section>
              )}

              {/* START CLASS HERE */}
              {action && action.primary_group && (
                <section className="space-y-4">
                  <h2 className="section-title">Start class here</h2>
                  <div className="card p-6 md:p-8 space-y-5" style={{ borderColor: "rgba(15,118,110,0.35)", borderWidth: 2 }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <span className="chip chip-primary text-xs mb-2">Recommended</span>
                        <h3 className="text-lg font-extrabold text-slate-900 leading-snug">{action.headline}</h3>
                        <p className="text-sm font-semibold text-slate-500 mt-1">
                          {action.primary_group.name} · {action.primary_group.member_count} students · {action.primary_group.focus_label}
                        </p>
                      </div>
                      <span className="chip chip-warning">Warm-up first</span>
                    </div>

                    {action.warm_up && (
                      <div className="p-4 rounded-xl space-y-1" style={{ background: "var(--primary-light)", border: "1px solid rgba(15,118,110,0.15)" }}>
                        <p className="text-sm font-extrabold" style={{ color: "var(--primary-dark)" }}>{action.warm_up.title}</p>
                        <p className="text-sm text-slate-700 font-medium">{action.warm_up.description}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Next 10 minutes</p>
                      <ol className="space-y-2">
                        {(action.next_10_minutes || []).map((step, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                            <span className="step-circle step-circle-idle" style={{ width: 26, height: 26, fontSize: 12 }}>{i + 1}</span>
                            <span className="pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                      <p className="text-xs text-slate-500 font-semibold pt-1">
                        Materials: {(action.materials || []).join(" · ")} — all locally available, no printing needed beyond paper.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <Link href={`/groups?class=${selectedClassId}`} className="btn btn-primary font-bold cursor-pointer">
                        <Play size={16} />
                        <span>Start Activity</span>
                      </Link>
                      <Link href={`/groups?class=${selectedClassId}&reassess=${action.primary_group.id || ""}`} className="btn btn-ghost font-bold cursor-pointer">
                        <RefreshCw size={16} />
                        <span>Reassess Group</span>
                      </Link>
                    </div>
                  </div>
                </section>
              )}

              {/* GROUP ACTIONS */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="section-title mb-0">Group actions</h2>
                  <Link href={`/groups?class=${selectedClassId}`} className="text-sm font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer">
                    All groups <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {groups.slice(0, 6).map((g) => (
                    <div key={g.id} className="card p-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-extrabold text-slate-900">{g.name}</p>
                        <span className="chip chip-neutral text-xs">{g.member_count} students</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-600">Focus: {g.focus_label}</p>
                      <p className="text-xs font-medium text-slate-500">{g.recommended_activity}</p>
                      <Link
                        href={`/groups?class=${selectedClassId}&group=${g.id}`}
                        className="text-xs font-extrabold text-teal-700 flex items-center gap-1 hover:underline cursor-pointer pt-1"
                      >
                        Open group <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>

              {/* QUICK CHECK */}
              <section className="space-y-4">
                <h2 className="section-title">Quick check</h2>
                <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-extrabold text-slate-900">After the activity: reassess</p>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">
                      {action?.quick_check?.instruction || "Run the 2-question quick check with the group, then scan their answers."}
                    </p>
                  </div>
                  <Link href={`/groups?class=${selectedClassId}&reassess=${action?.primary_group?.id || ""}`} className="btn btn-secondary font-bold cursor-pointer flex-shrink-0">
                    <RefreshCw size={16} />
                    <span>Run Quick Check</span>
                  </Link>
                </div>
              </section>
              {/* VIEW PROGRESS */}
              <div className="pt-4 flex justify-center border-t border-slate-200 mt-8 mb-4">
                <Link href={`/progress?class=${selectedClassId}`} className="btn btn-ghost font-bold cursor-pointer">
                  <TrendingUp size={16} /><span>View Class Progress</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
