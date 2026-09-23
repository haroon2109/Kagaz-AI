"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import EvidenceWhy from "@/components/evidence-why";
import { api } from "@/lib/api";
import { cachedFetch } from "@/lib/learning-cache";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, CircleDashed, Loader2,
  Play, BookOpen, TrendingUp, Clock,
} from "lucide-react";

/**
 * STUDENT LEARNING PROFILE — what the child can do, where they struggle,
 * and the recommended next action. Skill-based, not a marks report.
 */

const CONFIDENCE_LABEL = {
  high: { text: "Strong evidence", cls: "chip chip-success" },
  medium: { text: "Some evidence", cls: "chip chip-warning" },
  needs_verification: { text: "Needs verification", cls: "chip chip-error" },
};

function StatusRow({ label, value, studentId }) {
  const status = value?.status;
  const confidence = value?.confidence;
  const mark = { demonstrated: "✓", developing: "◐", needs_support: "○" }[status] || "?";
  const color = {
    demonstrated: "var(--success-text)",
    developing: "var(--warning-text)",
    needs_support: "var(--error-text)",
  }[status] || "var(--text-3)";
  const conf = CONFIDENCE_LABEL[confidence] || CONFIDENCE_LABEL.medium;
  const hasWhy = !!(
    value && (value.possible_gap || (value.items || []).length > 0
      || (value.evidence || []).length > 0 || value.verify_question)
  );
  return (
    <div className="py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg font-black flex-shrink-0" style={{ color }}>{mark}</span>
          <span className="text-sm font-bold text-slate-800">{label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] ${conf.cls}`}>{conf.text}</span>
        </div>
      </div>
      {hasWhy && (
        <div className="pl-8 pt-0.5">
          {value.possible_gap && (
            <p className="text-xs font-bold text-slate-600">{value.possible_gap}</p>
          )}
          <EvidenceWhy
            pattern={{
              type: value.pattern_type,
              possible_gap: value.possible_gap,
              pattern_description: value.pattern_description,
              observed: value.observed,
              competency_id: value.competency_id,
              items: value.items || [],
              supporting_count: value.supporting_count,
              total_questions: value.total_questions,
              evidence: value.evidence || [],
              confidence: value.confidence,
              evidence_strength: value.evidence_strength,
              needs_teacher_verification: value.needs_teacher_verification,
              verification_note: value.verification_note,
              verify_question: value.verify_question,
            }}
            studentId={studentId}
            evidenceId={value.evidence_id}
          />
        </div>
      )}
    </div>
  );
}

export default function StudentProfilePage({ params }) {
  const { id } = params;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await cachedFetch(() => api.learning.studentProfile(id), `student_${id}`);
    if (res.data) setProfile(res.data);
    else setError("Could not load this student's profile.");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (authLoading || (loading && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }} />
      </div>
    );
  }
  if (!user) return null;
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="card p-8 text-center space-y-3">
          <p className="font-bold">{error}</p>
          <Link href="/classes" className="btn btn-primary btn-sm">← Back</Link>
        </div>
      </div>
    );
  }

  const { student, summary, competencies, recent_evidence, recommended_action, timeline } = profile;
  const backHref = student.class_id ? `/classes/${student.class_id}` : "/classes";

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="page-header">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href={backHref} className="btn btn-ghost btn-sm font-bold cursor-pointer"><ArrowLeft size={14} /><span>Class</span></Link>
              <div>
                <h1 className="text-xl font-extrabold">{student.name}</h1>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">
                  Learning profile · {profile.subject === "mathematics" ? "Mathematics" : "Literacy"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
          {/* Competency summary */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--success-text)" }}>Demonstrated</p>
              {summary.demonstrated.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium">Not yet observed</p>
              ) : (
                summary.demonstrated.map((c) => (
                  <p key={c} className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: "var(--success)" }} /> {c}
                  </p>
                ))
              )}
            </div>
            <div className="card p-5 space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--warning-text)" }}>Developing</p>
              {summary.developing.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium">None right now</p>
              ) : (
                summary.developing.map((c) => (
                  <p key={c} className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <CircleDashed size={14} style={{ color: "var(--warning)" }} /> {c}
                  </p>
                ))
              )}
            </div>
            <div className="card p-5 space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--error-text)" }}>Needs support</p>
              {summary.needs_support.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium">None right now</p>
              ) : (
                summary.needs_support.map((c) => (
                  <p key={c} className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <AlertTriangle size={14} style={{ color: "var(--error)" }} /> {c}
                  </p>
                ))
              )}
            </div>
          </section>

          {/* Recommended next action */}
          {recommended_action && (
            <section className="space-y-3">
              <h2 className="section-title mb-0">Recommended next action</h2>
              <div className="card p-6 space-y-3" style={{ borderColor: "rgba(15,118,110,0.35)", borderWidth: 2 }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-extrabold text-slate-900">{recommended_action.title}</h3>
                    <p className="text-sm font-semibold text-slate-600">{recommended_action.goal}</p>
                  </div>
                  <span className="chip chip-primary">{recommended_action.duration_minutes} min</span>
                </div>
                <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Materials</p>
                <p className="text-sm font-medium text-slate-700 -mt-2">{(recommended_action.materials || []).join(" · ")}</p>
                <ol className="space-y-1.5">
                  {(recommended_action.teacher_steps || []).slice(0, 5).map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
                      <span className="font-black text-teal-700">{i + 1}.</span><span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Competency detail */}
            <section className="space-y-3">
              <h2 className="section-title mb-0">Evidence by competency</h2>
              <div className="card p-5">
                {Object.keys(competencies).length === 0 ? (
                  <p className="text-sm text-slate-500 font-medium">No scanned work yet.</p>
                ) : (
                  Object.entries(competencies).map(([label, v]) => (
                    <StatusRow key={label} label={label} value={v} studentId={student?.id || id} />
                  ))
                )}
              </div>
            </section>

            {/* Timeline */}
            <section className="space-y-3">
              <h2 className="section-title mb-0">Progress timeline</h2>
              <div className="card p-5 space-y-0">
                {(timeline || []).length === 0 ? (
                  <p className="text-sm text-slate-500 font-medium">Timeline appears after the first scan.</p>
                ) : (
                  timeline.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ background: t.status === "demonstrated" ? "var(--success)" : t.status === "developing" ? "var(--warning)" : "var(--error)" }} />
                        {i < timeline.length - 1 && <span className="w-0.5 h-6 bg-slate-200" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">{t.competency} {t.status === "demonstrated" ? "✓" : t.status === "developing" ? "◐" : "○"}</p>
                        <p className="text-xs font-semibold text-slate-400">
                          {t.source === "reassessment" ? "Quick check" : "Assessment"} · {t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <p className="text-[11px] text-slate-400 font-medium pt-2">Progress about skills — not marks.</p>
              </div>
            </section>
          </div>

          {/* Recent evidence */}
          <section className="space-y-3">
            <h2 className="section-title mb-0">Recent scanned work</h2>
            <div className="card p-2">
              {(recent_evidence || []).length === 0 ? (
                <p className="text-sm text-slate-500 font-medium p-5">No scanned papers yet.</p>
              ) : (
                recent_evidence.map((w) => (
                  <Link key={w.worksheet_id} href={`/worksheet/${w.worksheet_id}`} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[var(--primary-light)] no-underline transition-all">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{w.title}</p>
                      <p className="text-xs font-semibold text-slate-400">{w.date ? new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""}</p>
                    </div>
                    <span className={`chip text-xs ${w.status === "completed" ? "chip-success" : "chip-warning"}`}>
                      {w.status === "completed" ? "Analyzed" : "Needs review"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
