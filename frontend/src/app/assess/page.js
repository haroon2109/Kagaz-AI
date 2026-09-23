"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import CameraCapture from "@/components/camera-capture";
import { api } from "@/lib/api";
import {
  ClipboardList, Printer, Upload, Camera, Loader2, CheckCircle2,
  AlertTriangle, ArrowRight, Users, FileText, RefreshCw,
} from "lucide-react";

/**
 * ASSESS — create a quick foundational assessment (short, printable, low-ink)
 * or upload your own paper, then scan each student's work. Reassessment mode
 * generates a targeted 2–5 question quick check for a learning group.
 */

function PrintTemplate({ template }) {
  if (!template) return null;
  return (
    <div id="kagaz-print-area" className="card p-8 bg-white max-w-[640px] mx-auto font-mono text-sm leading-relaxed">
      <p className="text-center font-bold text-base mb-1">{template.title}</p>
      <p className="text-center text-[11px] text-slate-500 mb-4">{template.description}</p>
      {template.printable.map((line, i) => (
        <p key={i} className="whitespace-pre-wrap">{line}</p>
      ))}
      <p className="text-center text-[10px] text-slate-400 mt-6">Kagaz AI · quick foundational check</p>
    </div>
  );
}

export default function AssessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }} />
      </div>
    }>
      <AssessPageInner />
    </Suspense>
  );
}

function AssessPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [templateKey, setTemplateKey] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [mode, setMode] = useState("template"); // template | custom
  const [assessment, setAssessment] = useState(null);

  // Scan queue: one image per student
  const [scans, setScans] = useState([]); // [{studentId, studentName, file, previewUrl, status}]
  const [students, setStudents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const fileInputRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStudentIdx, setCameraStudentIdx] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [cls, tpls] = await Promise.all([
          api.learning.listClasses(),
          api.learning.getTemplates(),
        ]);
        setClasses(cls || []);
        setTemplates(tpls || []);
        const preselect = searchParams.get("class") || (cls && cls[0] && cls[0].id);
        if (preselect) setClassId(preselect);
        if (tpls && tpls.length > 0) setTemplateKey(tpls[0].key);
      } catch (err) {
        setError("Could not load classes/templates: " + err.message);
      }
    })();
  }, [user]);

  // Load roster when class changes
  useEffect(() => {
    if (!classId) return;
    setStudents([]);
    setScans([]);
    setAssessment(null);
    (async () => {
      try {
        const detail = await api.learning.getClass(classId);
        setStudents(detail.students || []);
      } catch {}
    })();
  }, [classId]);

  const selectedTemplate = templates.find((t) => t.key === templateKey) || null;

  const createAssessment = async () => {
    setError("");
    setBusy(true);
    try {
      const a = await api.learning.createAssessment({
        class_id: classId,
        subject: selectedTemplate ? selectedTemplate.subject : "mathematics",
        title: mode === "custom" ? (customTitle || "My paper") : null,
        template_key: mode === "template" ? templateKey : null,
      });
      setAssessment(a);
    } catch (err) {
      setError("Could not create assessment: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const addFileForStudent = (idx, file) => {
    setScans((prev) => {
      const next = [...prev];
      next[idx] = { studentId: students[idx]?.id || null, studentName: students[idx]?.name || "Unassigned", file, previewUrl: URL.createObjectURL(file), status: "pending" };
      return next;
    });
  };

  const handleUploadAll = async () => {
    if (!assessment) return;
    setError("");
    setBusy(true);
    const results = [];
    try {
      for (let i = 0; i < scans.length; i++) {
        const scan = scans[i];
        if (!scan) continue;
        setUploadingIndex(i);
        setScans((prev) => prev.map((s, j) => (j === i ? { ...s, status: "uploading" } : s)));
        try {
          const up = await api.worksheets.upload(scan.file);
          const attached = await api.learning.attachScan(assessment.id, {
            student_id: scan.studentId,
            student_name: scan.studentId ? null : scan.studentName,
            image_url: up.image_url,
            title: `${assessment.title} — ${scan.studentName}`,
          });
          setScans((prev) => prev.map((s, j) => (j === i ? { ...s, status: "scanning" } : s)));
          results.push(attached.worksheet_id);
        } catch (err) {
          setScans((prev) => prev.map((s, j) => (j === i ? { ...s, status: "error" } : s)));
          setError(`Scan ${i + 1} failed: ${err.message}`);
        }
      }
      if (results.length > 0) {
        router.push(`/assess/${assessment.id}`);
      }
    } finally {
      setBusy(false);
      setUploadingIndex(null);
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

  const reassessMode = searchParams.get("mode") === "reassess";
  const anyScans = scans.filter(Boolean).length > 0;

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="page-header">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight">Assess</h1>
              <p className="text-sm mt-0.5 text-slate-500">
                {reassessMode ? "Quick reassessment for a learning group" : "Quick assessment → scan student work"}
              </p>
            </div>
            <Link href="/today" className="btn btn-ghost btn-sm font-bold cursor-pointer">← Today</Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
          {error && <div className="alert alert-error"><AlertTriangle size={18} className="flex-shrink-0" /><span>{error}</span></div>}

          {/* Step 1 — class + template */}
          <section className="space-y-4">
            <h2 className="section-title">1 · Create the assessment</h2>
            <div className="card p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Class</label>
                  <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                    <option value="">Select class…</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_demo ? " ★" : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode("template")}
                      className={`btn btn-sm flex-1 font-bold cursor-pointer ${mode === "template" ? "btn-primary" : "btn-ghost"}`}
                    >
                      Kagaz quick check
                    </button>
                    <button
                      onClick={() => setMode("custom")}
                      className={`btn btn-sm flex-1 font-bold cursor-pointer ${mode === "custom" ? "btn-primary" : "btn-ghost"}`}
                    >
                      My own paper
                    </button>
                  </div>
                </div>
              </div>

              {mode === "template" && (
                <div>
                  <label className="field-label">Choose the quick check</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {templates.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTemplateKey(t.key)}
                        className="card p-4 text-left cursor-pointer transition-all"
                        style={{ borderColor: templateKey === t.key ? "var(--primary)" : undefined, borderWidth: templateKey === t.key ? 2 : 1.5 }}
                      >
                        <p className="text-sm font-extrabold text-slate-900">{t.title}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "custom" && (
                <div>
                  <label className="field-label">Paper title</label>
                  <input className="input" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="e.g. Unit 4 class test" />
                  <p className="text-xs font-medium text-slate-500 mt-2">
                    Kagaz will read whatever is on the paper. For competency mapping, the quick checks are more precise.
                  </p>
                </div>
              )}

              <button onClick={createAssessment} disabled={!classId || busy || (mode === "template" && !templateKey)} className="btn btn-primary font-bold cursor-pointer">
                {busy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : assessment ? (
                  <CheckCircle2 size={16} className="animate-pop-in text-emerald-600" />
                ) : (
                  <ClipboardList size={16} />
                )}
                <span>{assessment ? "Assessment ready ✓" : "Create assessment"}</span>
              </button>
            </div>
          </section>

          {/* Step 2 — print (reveals with a directional step transition once the assessment exists) */}
          {assessment && mode === "template" && selectedTemplate && (
            <section className="space-y-4 animate-step-in">
              <div className="flex items-center justify-between">
                <h2 className="section-title mb-0">2 · Print & hand out</h2>
                <Printer
                  size={18}
                  className="text-teal-700 cursor-pointer hover:text-teal-900 print:hidden"
                  onClick={() => window.print()}
                />
              </div>
              <PrintTemplate template={selectedTemplate} />
            </section>
          )}

          {/* Step 3 — scan (steps in after the assessment is created) */}
          {assessment && (
            <section className="space-y-4 animate-step-in">
              <h2 className="section-title">3 · Scan student work</h2>
              <div className="card p-6 space-y-5">
                <p className="text-sm font-medium text-slate-600">
                  One photo per student's paper. After scanning, Kagaz shows <b>What Kagaz Read</b> — you can correct anything before analysis.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {students.map((s, idx) => {
                    const scan = scans[idx];
                    return (
                      <div
                        key={s.id}
                        className="animate-chip-reveal flex items-center gap-3 p-3 rounded-xl border"
                        style={{ borderColor: "var(--border)", animationDelay: `${Math.min(idx * 50, 400)}ms` }}
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "var(--primary)" }}>
                          {(s.name || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                          <p className="text-xs font-semibold text-slate-400">
                            {scan?.status === "uploading" && "Uploading…"}
                            {scan?.status === "scanning" && "Reading…"}
                            {scan?.status === "error" && "Failed — retry"}
                            {(!scan || scan.status === "pending") && "Waiting for photo"}
                          </p>
                        </div>
                        {scan?.previewUrl ? (
                          <div className="flex items-center gap-2">
                            <img src={scan.previewUrl} alt="" className="w-10 h-14 object-cover rounded border" />
                            {scan.status === "error" && (
                              <button onClick={() => setScans(prev => prev.map((s, j) => j === idx ? null : s))} className="btn btn-ghost btn-sm text-red-500 p-1 cursor-pointer" title="Clear and retry"><RefreshCw size={14} /></button>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => { setCameraStudentIdx(idx); setCameraOpen(true); }} className="btn btn-ghost btn-sm cursor-pointer" title="Camera"><Camera size={14} /></button>
                            <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost btn-sm cursor-pointer" title="Upload"><Upload size={14} /></button>
                          </div>
                        )}
                        {/* hidden per-card file input */}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && addFileForStudent(idx, e.target.files[0])}
                          ref={(el) => { if (el) el.dataset.idx = idx; }}
                        />
                      </div>
                    );
                  })}
                </div>

                {students.length === 0 && (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-sm font-semibold text-slate-500">This class has no students yet.</p>
                    <Link href={`/classes/${classId}`} className="btn btn-secondary btn-sm font-bold cursor-pointer"><Users size={14} /><span>Add students</span></Link>
                  </div>
                )}

                {/* Batch upload button for phones (single input, sequential assignment) */}
                <div className="flex flex-wrap gap-3 items-center pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach((f, k) => {
                        const idx = scans.findIndex((s) => !s);
                        addFileForStudent(idx >= 0 ? idx : k, f);
                      });
                    }}
                  />
                  <button onClick={handleUploadAll} disabled={!anyScans || busy} className="btn btn-primary font-bold cursor-pointer">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    <span>{busy ? "Scanning…" : "Scan & read answers"}</span>
                  </button>
                  {assessment && (
                    <Link href={`/assess/${assessment.id}`} className="btn btn-ghost font-bold cursor-pointer">
                      <FileText size={16} /><span>View reading results</span>
                    </Link>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <CameraCapture
        open={cameraOpen}
        onOpenChange={(o) => { setCameraOpen(o); if (!o) setCameraStudentIdx(null); }}
        onCapture={(file) => { if (cameraStudentIdx != null) addFileForStudent(cameraStudentIdx, file); }}
      />
    </div>
  );
}
