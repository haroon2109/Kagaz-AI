"use client";

import React, { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import { cachedFetch } from "@/lib/learning-cache";
import { AiEngineChip } from "@/components/api-status-banner";
import {
  Layers, Users, Play, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
  ChevronRight, ArrowLeft, Printer, WifiOff, TrendingUp, X, Camera, Upload,
} from "lucide-react";

/**
 * LEARNING GROUPS — group by demonstrated competency, not marks.
 * Each group shows its focus and recommended activity; the teacher can open
 * the 10-minute remediation, then REASSESS with a quick check. After scans,
 * members who demonstrated the skill are marked ready to advance.
 */

function ActivityModal({ intervention, onClose }) {
  if (!intervention) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="chip chip-primary text-xs mb-1">10-minute remediation</span>
            <h3 className="text-lg font-extrabold text-slate-900">{intervention.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"><X size={18} /></button>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Goal</p>
          <p className="text-sm font-semibold text-slate-700">{intervention.goal}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Materials — all locally available</p>
          <p className="text-sm font-medium text-slate-700">{(intervention.materials || []).join(" · ")}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Teacher says / does</p>
          <ol className="space-y-2">
            {(intervention.teacher_steps || []).map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                <span className="step-circle step-circle-idle" style={{ width: 24, height: 24, fontSize: 11 }}>{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {intervention.guided_practice?.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Guided practice</p>
            <div className="flex flex-wrap gap-2">
              {intervention.guided_practice.map((q, i) => (
                <span key={i} className="chip chip-neutral font-mono">{q}</span>
              ))}
            </div>
          </div>
        )}
        {intervention.independent_check?.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Independent check</p>
            <div className="flex flex-wrap gap-2">
              {intervention.independent_check.map((q, i) => (
                <span key={i} className="chip chip-neutral font-mono">{q}</span>
              ))}
            </div>
          </div>
        )}
        {intervention.mastery_check?.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Mastery check</p>
            <div className="flex flex-wrap gap-2">
              {intervention.mastery_check.map((q, i) => (
                <span key={i} className="chip chip-primary font-mono">{q}</span>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => window.print()} className="btn btn-ghost btn-sm font-bold cursor-pointer w-full print:hidden">
          <Printer size={14} /><span>Print activity</span>
        </button>
      </div>
    </div>
  );
}

function ReassessPanel({ group, onDone, onError }) {
  const [stage, setStage] = useState("idle"); // idle | questions | result
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [scans, setScans] = useState({}); // studentId -> {name, file, status}
  const [uploading, setUploading] = useState(null);
  const cameraTargetRef = useRef(null);
  const fileInputRef = useRef(null);

  const start = async () => {
    setBusy(true);
    try {
      const res = await api.learning.reassessGroup(group.id, {});
      setData(res);
      setScans(Object.fromEntries((res.members || []).map((sid) => [sid, { name: res.member_names?.[sid] || "Student", status: "pending" }])));
      setStage("questions");
    } catch (err) {
      onError && onError("Could not create quick check: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  // Scan one student's quick-check paper: upload + attach to the reassessment.
  const scanStudent = async (studentId) => {
    const target = scans[studentId];
    if (!target?.file) return;
    setUploading(studentId);
    setScans((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status: "uploading" } }));
    try {
      const up = await api.worksheets.upload(target.file);
      await api.learning.attachScan(data.assessment_id, {
        student_id: studentId,
        image_url: up.image_url,
        title: `${group.name} quick check — ${target.name}`,
      });
      setScans((upload) => ({ ...upload, [studentId]: { ...upload[studentId], status: "scanned" } }));
    } catch (err) {
      setScans((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status: "error" } }));
      onError && onError(`Scan failed for ${target.name}: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      const res = await api.learning.completeReassess(data.assessment_id);
      setData((prev) => ({ ...prev, ...res }));
      setStage("result");
      onDone && onDone(res);
    } catch (err) {
      onError && onError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  };

  const scannedCount = Object.values(scans).filter((s) => s.status === "scanned").length;

  return (
    <div className="card p-5 space-y-4" style={{ borderColor: "rgba(15,118,110,0.35)", borderWidth: 2 }}>
      <div className="flex items-center gap-2">
        <RefreshCw size={16} className="text-teal-700" />
        <p className="font-extrabold text-slate-900">Quick reassessment — {group.name}</p>
      </div>

      {stage === "idle" && (
        <>
          <p className="text-sm font-medium text-slate-600">
            Kagaz will give 2–3 questions targeted at <b>{group.focus_label}</b>. Run them with the group, scan each paper below, and Kagaz regroups automatically.
          </p>
          <button onClick={start} disabled={busy} className="btn btn-primary btn-sm font-bold cursor-pointer">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>Generate quick check</span>
          </button>
        </>
      )}

      {stage === "questions" && data && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="chip chip-primary text-xs">
              {data.question_source === "ai_generated" ? "AI-generated quick check" : "Library quick check"}
            </span>
            {data.questions?.[0]?.engine && <AiEngineChip engine={data.questions[0].engine} />}
          </div>
          <div className="space-y-2">
            {data.questions.map((q) => (
              <div key={q.number} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="step-circle step-circle-active" style={{ width: 26, height: 26, fontSize: 12 }}>{q.number}</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{q.text}</span>
              </div>
            ))}

          </div>

          {/* Per-student inline scanning — no detour to the Assess tab */}
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Scan each member's paper</p>
            {Object.entries(scans).map(([sid, s]) => (
              <div key={sid} className="flex items-center gap-3 p-2.5 rounded-xl border" style={{ borderColor: "var(--border)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "var(--primary)" }}>
                  {(s.name || "?")[0].toUpperCase()}
                </div>
                <p className="text-sm font-bold text-slate-800 flex-1 min-w-0 truncate">{s.name}</p>
                <span className={`chip text-xs ${s.status === "scanned" ? "chip-success" : s.status === "error" ? "chip-error" : "chip-neutral"}`}>
                  {s.status === "uploading" ? "Uploading…" : s.status === "scanned" ? "Scanned ✓" : s.status === "error" ? "Retry" : "Waiting"}
                </span>
                {s.status !== "scanned" && (
                  <>
                    <button
                      onClick={() => { cameraTargetRef.current = sid; fileInputRef.current?.click(); }}
                      disabled={uploading === sid}
                      className="btn btn-ghost btn-sm cursor-pointer"
                      title="Take/choose photo"
                    >
                      <Camera size={14} />
                    </button>
                    {s.file && (
                      <button onClick={() => scanStudent(sid)} disabled={uploading === sid} className="btn btn-primary btn-sm font-bold cursor-pointer">
                        {uploading === sid ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const sid = cameraTargetRef.current;
                const file = e.target.files?.[0];
                if (sid && file) {
                  setScans((prev) => ({ ...prev, [sid]: { ...prev[sid], file, status: "ready" } }));
                  setTimeout(() => scanStudent(sid), 50);
                }
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={finish} disabled={busy || scannedCount === 0} className="btn btn-primary btn-sm font-bold cursor-pointer">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>Confirm regrouping ({scannedCount} scanned)</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Regrouping compares each scanned paper against the student's previous evidence. Members who improve move up; others keep support.
          </p>
        </>
      )}

      {stage === "result" && (
        <div className="space-y-3">
          <p className="text-sm font-bold" style={{ color: "var(--success-text)" }}>{data?.message || "Regrouping applied — groups updated."}</p>
          {data?.groups_after?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.groups_after.map((g) => (
                <span key={g.name} className="chip chip-neutral text-xs">{g.name}: {g.member_count}</span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Link href="/today" className="btn btn-primary btn-sm font-bold cursor-pointer">See today's action →</Link>
            <button onClick={() => { setStage("idle"); setData(null); setScans({}); }} className="btn btn-ghost btn-sm font-bold cursor-pointer">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }} />
      </div>
    }>
      <GroupsPageInner />
    </Suspense>
  );
}

function GroupsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activity, setActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(null);
  const [reassessGroupId, setReassessGroupId] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const loadGroups = useCallback(async (cid) => {
    setLoading(true);
    const res = await cachedFetch(() => api.learning.getGroups(cid), `groups_${cid}`);
    if (res.data) setGroups(res.data);
    else setError("Could not load groups.");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const cls = await api.learning.listClasses();
        setClasses(cls || []);
        const pre = searchParams.get("class") || (cls && cls[0] && cls[0].id);
        if (pre) setClassId(pre);
      } catch {
        setError("Could not load classes.");
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (classId) loadGroups(classId);
  }, [classId, loadGroups]);

  // Deep link: ?reassess=<groupId> or ?group=<groupId> opens the panel
  useEffect(() => {
    const r = searchParams.get("reassess");
    if (r) setReassessGroupId(r);
  }, [searchParams]);

  const openActivity = async (competencyId) => {
    setLoadingActivity(competencyId);
    setError("");
    try {
      const act = await api.learning.getIntervention(competencyId);
      setActivity(act);
    } catch (err) {
      setError("Could not load activity: " + err.message);
    } finally {
      setLoadingActivity(null);
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
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight">Learning Groups</h1>
              <p className="text-sm mt-0.5 text-slate-500">Grouped by demonstrated competency — not marks</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input input-sm max-w-[220px] font-semibold">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_demo ? " ★" : ""}</option>)}
              </select>
              <Link href={`/today`} className="btn btn-ghost btn-sm font-bold cursor-pointer">← Today</Link>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
          {error && <div className="alert alert-error"><AlertTriangle size={18} className="flex-shrink-0" /><span>{error}</span></div>}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="card h-28 animate-pulse" />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="card p-10 text-center space-y-4 max-w-lg mx-auto">
              <Layers className="mx-auto text-slate-300" size={40} />
              <h2 className="text-lg font-extrabold text-slate-900">No groups yet</h2>
              <p className="text-sm text-slate-600 font-medium">Groups appear after you scan an assessment. Kagaz groups students by what they demonstrated.</p>
              <Link href={`/assess?class=${classId}`} className="btn btn-primary btn-sm font-bold cursor-pointer">Create assessment</Link>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.id} className="space-y-3">
                <div className="card p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-extrabold text-slate-900">{g.name}</h3>
                        <span className="chip chip-neutral text-xs">{g.members.length} students</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 mt-1">Focus: {g.focus_label}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Recommended: {g.recommended_activity}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => g.focus_competency && openActivity(g.focus_competency)}
                        disabled={!g.focus_competency || loadingActivity === g.focus_competency}
                        className="btn btn-primary btn-sm font-bold cursor-pointer"
                      >
                        {loadingActivity === g.focus_competency ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                        <span>Start Activity</span>
                      </button>
                      <button
                        onClick={() => setReassessGroupId(reassessGroupId === g.id ? null : g.id)}
                        className="btn btn-ghost btn-sm font-bold cursor-pointer"
                      >
                        <RefreshCw size={13} /><span>Reassess</span>
                      </button>
                    </div>
                  </div>

                  {/* Members */}
                  <div className="flex flex-wrap gap-1.5">
                    {g.members.map((m) => (
                      <Link
                        key={m.member_id}
                        href={`/students/${m.student_id}`}
                        className={`chip text-xs cursor-pointer ${m.status === "ready_to_advance" ? "chip-success" : m.status === "continue_support" ? "chip-warning" : "chip-neutral"}`}
                        title={m.status === "ready_to_advance" ? "Ready to advance" : m.status === "continue_support" ? "Continue support" : "Active"}
                      >
                        {m.name}
                        {/* multi-grade: show each child's grade inside the group */}
                        {m.grade_level ? <span className="opacity-60 font-medium"> · {m.grade_level}</span> : null}
                        {m.status === "ready_to_advance" && " ↑"}
                      </Link>
                    ))}
                  </div>
                </div>

                {reassessGroupId === g.id && (
                  <ReassessPanel
                    group={g}
                    onDone={() => loadGroups(classId)}
                    onError={(m) => setError(m)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </main>

      <ActivityModal intervention={activity} onClose={() => setActivity(null)} />
    </div>
  );
}
