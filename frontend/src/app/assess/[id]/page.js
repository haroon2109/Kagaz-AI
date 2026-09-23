"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import {
  Loader2, CheckCircle2, AlertTriangle, Eye, ArrowRight, RefreshCw,
  ClipboardList, WifiOff, Layers, Play
} from "lucide-react";

/**
 * ASSESSMENT RESULTS — live status of each scanned paper: OCR progress,
 * ready for review ("What Kagaz Read"), or analyzed. Teacher taps through to
 * the Understand view per student.
 *
 * Motion: rows reveal staggered on load; when a paper finishes OCR its status
 * chip pops in (animate-pop-in) so the teacher's eye is drawn to exactly the
 * row that changed during polling; the all-done banner pops with a ripple.
 */

function ScanRow({ scan, style }) {
  const statusView = {
    processing: { icon: Loader2, spin: true, label: "Reading handwriting…", cls: "chip chip-info" },
    ocr_complete: { icon: Eye, spin: false, label: "Ready for review", cls: "chip chip-warning", pop: true },
    completed: { icon: CheckCircle2, spin: false, label: "Understood ✓", cls: "chip chip-success", pop: true },
    failed: { icon: AlertTriangle, spin: false, label: "Scan failed — re-scan needed", cls: "chip chip-error" },
  }[scan.status] || { icon: Loader2, spin: true, label: scan.status, cls: "chip chip-neutral" };
  const Icon = statusView.icon;

  return (
    <tr className="animate-chip-reveal" style={style}>
      <td>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "var(--primary)" }}>
            {(scan.student_name || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{scan.student_name || "Unassigned"}</p>
            <p className="text-xs font-semibold text-slate-400">{scan.status === "completed" && scan.final_score != null ? `Checked · ${Math.round(scan.final_score)}%` : " "}</p>
          </div>
        </div>
      </td>
      <td>
        <span
          key={scan.status}
          className={`${statusView.cls} ${statusView.pop ? "animate-pop-in" : ""}`}
        >
          <Icon size={12} className={statusView.spin ? "animate-spin" : ""} />
          {statusView.label}
        </span>
      </td>
      <td className="text-right">
        <Link
          href={`/worksheet/${scan.id}`}
          className="btn btn-ghost btn-sm font-bold cursor-pointer inline-flex items-center gap-1"
        >
          <span>{scan.status === "ocr_complete" ? "Review & understand" : "View"}</span>
          <ArrowRight size={13} />
        </Link>
      </td>
    </tr>
  );
}

export default function AssessmentResultsPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.learning.getAssessment(id);
      setAssessment(data);
      const anyProcessing = (data.scans || []).some((s) => s.status === "processing");
      return anyProcessing;
    } catch (err) {
      setError("Could not load this assessment.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // Poll while any scan is processing
  useEffect(() => {
    if (!user) return;
    let stop = false;
    (async () => {
      let busy = await load();
      while (busy && !stop) {
        await new Promise((r) => setTimeout(r, 4000));
        busy = await load(true);
      }
    })();
    return () => { stop = true; };
  }, [user, load]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }} />
      </div>
    );
  }
  if (!user) return null;
  if (!assessment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="card p-8 text-center space-y-3">
          <p className="font-bold">{error || "Assessment not found"}</p>
          <Link href="/assess" className="btn btn-primary btn-sm">← Back to Assess</Link>
        </div>
      </div>
    );
  }

  const scans = assessment.scans || [];
  const processingCount = scans.filter((s) => s.status === "processing").length;
  const readyCount = scans.filter((s) => s.status === "ocr_complete").length;
  const doneCount = scans.filter((s) => s.status === "completed").length;

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="page-header">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Link href="/assess" className="text-sm font-bold text-slate-400 hover:text-teal-700 cursor-pointer">Assess</Link>
                <span className="text-slate-300">/</span>
                <h1 className="text-xl font-extrabold">{assessment.title}</h1>
              </div>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">
                {scans.length} scans · {processingCount > 0 ? `${processingCount} reading…` : "all read"}
                {assessment.is_reassessment ? " · Reassessment" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {assessment.class_id && (
                <Link href={`/classes/${assessment.class_id}`} className="btn btn-ghost btn-sm font-bold cursor-pointer">
                  Class map
                </Link>
              )}
              <button onClick={() => load()} className="btn btn-ghost btn-sm font-bold cursor-pointer">
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /><span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
          {/* Progress banner — indeterminate bar rides under the copy while reading */}
          {processingCount > 0 && (
            <div className="alert alert-info animate-fade-in flex-col !items-stretch gap-2.5">
              <div className="flex items-center gap-3">
                <Loader2 size={18} className="animate-spin flex-shrink-0" />
                <span className="font-bold">Kagaz is reading {processingCount} paper{processingCount > 1 ? "s" : ""}… this usually takes under a minute.</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(6, 182, 212, 0.15)" }}>
                <div className="animate-indeterminate h-full w-1/3 rounded-full" style={{ background: "var(--info)" }} />
              </div>
            </div>
          )}
          {processingCount === 0 && readyCount > 0 && (
            <div className="alert alert-teal animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Eye size={18} className="flex-shrink-0 mt-0.5" />
                <span className="font-bold">
                  {readyCount} paper{readyCount > 1 ? "s are" : " is"} ready for review. Check <b>What Kagaz Read</b> — correct anything wrong, then confirm.
                </span>
              </div>
              <Link href={`/worksheet/${scans.find(s => s.status === "ocr_complete")?.id}`} className="btn btn-primary btn-sm font-bold flex-shrink-0 cursor-pointer">
                Review all <ArrowRight size={14} />
              </Link>
            </div>
          )}
          {processingCount === 0 && readyCount === 0 && doneCount > 0 && (
            <div className="alert alert-success animate-pop-in flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="relative flex-shrink-0 mt-0.5">
                  <span className="animate-ripple absolute inset-0 rounded-full" style={{ background: "var(--success)" }} />
                  <CheckCircle2 size={18} className="relative" />
                </span>
                <span className="font-bold">All papers analyzed. See the class map and groups for what to do next.</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <Link href={`/today`} className="btn bg-white text-emerald-800 border-none btn-sm font-bold cursor-pointer hover:bg-emerald-50">
                  <Play size={14} /> Today's Action
                </Link>
                {assessment.class_id && (
                  <Link href={`/groups?class=${assessment.class_id}`} className="btn bg-white text-emerald-800 border-none btn-sm font-bold cursor-pointer hover:bg-emerald-50">
                    <Layers size={14} /> View Groups
                  </Link>
                )}
              </div>
            </div>
          )}
          {scans.length === 0 && (
            <div className="card p-10 text-center space-y-3 max-w-lg mx-auto animate-fade-in">
              <ClipboardList className="mx-auto text-slate-300" size={36} />
              <p className="font-bold text-slate-700">No scans yet</p>
              <p className="text-sm text-slate-500 font-medium">Go back to Assess and add photos of student papers.</p>
              <Link href={`/assess?class=${assessment.class_id || ""}`} className="btn btn-primary btn-sm font-bold cursor-pointer">Add scans</Link>
            </div>
          )}

          {scans.length > 0 && (
            <div className="card overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {scans.map((s, i) => (
                      <ScanRow key={s.id} scan={s} style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
