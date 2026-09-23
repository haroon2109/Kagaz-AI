"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import Sidebar from "@/components/sidebar";
import EvidenceWhy from "@/components/evidence-why";
import ApiStatusBanner from "@/components/api-status-banner";
import { api } from "@/lib/api";
import { 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  Zap, 
  Loader2, 
  Check, 
  AlertCircle, 
  Eye, 
  Brain, 
  Sparkles, 
  BookOpen, 
  TrendingUp,
  FileImage
} from "lucide-react";

// ─── Status header bar ────────────────────────────────────────────────────────
function StatusBar({ status, t }) {
  const map = {
    processing:   { icon: Loader2,     text: t("ocrScanningText"),   bg: "var(--info-light)",    border: "rgba(6, 182, 212, 0.25)", color: "var(--info-text)",    pulse: true  },
    ocr_complete: { icon: Eye,         text: t("ocrCompleteText"),   bg: "var(--warning-light)", border: "rgba(245, 158, 11, 0.25)", color: "var(--warning-text)", pulse: false },
    completed:    { icon: Check,       text: t("completedText"),     bg: "var(--success-light)", border: "rgba(16, 185, 129, 0.25)", color: "var(--success-text)", pulse: false },
    failed:       { icon: AlertCircle, text: t("failedText"),        bg: "var(--error-light)",  border: "rgba(239, 68, 68, 0.25)",  color: "var(--error-text)",   pulse: false },
  };
  const m = map[status] || map.processing;
  const IconComponent = m.icon;

  return (
    <div
      className="flex items-center gap-3.5 px-5 py-4 rounded-2xl"
      style={{ background: m.bg, border: `1.5px solid ${m.border}` }}
    >
      <div className={`text-xl ${m.pulse ? "animate-spin" : ""}`} style={{ color: m.color }}>
        <IconComponent size={20} />
      </div>
      <div>
        <p className="text-sm font-bold leading-tight" style={{ color: m.color }}>{m.text}</p>
      </div>
    </div>
  );
}

// ─── Understand panel (evidence engine + teacher-in-the-loop) ────────────────
const CONFIDENCE_CHIP = {
  high:               { label: "Confidence: High",             cls: "chip chip-success" },
  medium:             { label: "Confidence: Medium",           cls: "chip chip-warning" },
  needs_verification: { label: "Needs verification",           cls: "chip chip-error"   },
};

function UnderstandPanel({ worksheetId, analysis, onChanged }) {
  const [sent, setSent] = useState({}); // patternIndex -> verdict
  const shown = analysis || null;
  const patterns = (shown && shown.patterns) || [];
  const summary = (shown && shown.summary) || {};
  // Teacher verdict state mirrors EvidenceWhy callbacks (Confirm/Edit/Verify
  // live inside each Why? panel now — no separate opaque buttons here).
  const markVerdict = (idx, verdict) => {
    setSent((prev) => ({ ...prev, [idx]: verdict }));
    onChanged && onChanged();
  };
  if (!shown) return null;

  return (
    <div className="card p-6 space-y-6" style={{ borderColor: "rgba(15,118,110,0.3)", borderWidth: 2 }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Brain size={20} className="text-teal-700" />
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">Understand</h3>
            <p className="text-xs font-semibold text-slate-500">What the work shows — evidence first, never a guess</p>
          </div>
        </div>
        <span className="chip chip-primary text-xs">Learning level: {shown.tier_hint != null ? `Group ${"ABCDE"[Number(shown.tier_hint)] || "A"}` : "—"}</span>
      </div>

      {/* Demonstrated / Developing / Needs support */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { key: "demonstrated", label: "Demonstrated", mark: "✓", color: "var(--success-text)" },
          { key: "developing", label: "Developing", mark: "◐", color: "var(--warning-text)" },
          { key: "needs_support", label: "Needs support", mark: "○", color: "var(--error-text)" },
        ].map((b) => (
          <div key={b.key} className="p-3.5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: b.color }}>{b.mark} {b.label}</p>
            {(summary[b.key] || []).length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold mt-1">—</p>
            ) : (
              (summary[b.key] || []).map((cid) => (
                <p key={cid} className="text-sm font-bold text-slate-700 mt-1">{shown.competencies?.[cid]?.label || cid}</p>
              ))
            )}
          </div>
        ))}
      </div>

      {/* Error patterns with teacher-in-the-loop */}
      {patterns.length > 0 && (
        <div className="space-y-3">
          <p className="section-title">Observed patterns</p>
          {patterns.map((p, idx) => {
            const conf = CONFIDENCE_CHIP[p.confidence] || CONFIDENCE_CHIP.medium;
            const myVerdict = sent[idx];
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border space-y-2.5"
                style={{
                  background: p.confidence === "needs_verification" ? "var(--warning-light)" : "var(--error-light)",
                  borderColor: p.confidence === "needs_verification" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.2)",
                }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold" style={{ color: p.confidence === "needs_verification" ? "var(--warning-text)" : "var(--error-text)" }}>
                      {p.possible_gap || "Insufficient evidence — needs a quick check"}
                    </p>
                    <p className="text-sm font-semibold text-slate-600 mt-0.5">{p.observed}</p>
                    <EvidenceWhy pattern={p} worksheetId={worksheetId}
                      onAction={(v) => markVerdict(idx, v)} />
                  </div>
                  <span className={`text-xs ${conf.cls}`}>{conf.label}</span>
                </div>

                {myVerdict ? (
                  <p className="text-xs font-bold text-teal-700">✓ Noted — thank you. Your feedback improves Kagaz.</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {patterns.length === 0 && (
        <p className="text-sm font-medium text-slate-500">No recurring error patterns detected in this paper.</p>
      )}
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────
function QuestionCard({ item, onChange, onToggle, t, index = 0 }) {
  const inputRef = useRef(null);
  const stateColors = {
    correct:   { bg: "var(--success-light)",  border: "rgba(16, 185, 129, 0.25)" },
    incorrect: { bg: "var(--error-light)",    border: "rgba(239, 68, 68, 0.25)" },
    pending:   { bg: "var(--surface)",        border: "var(--border)" },
  };
  // Highlight low confidence with orange border
  // Extract raw confidence as a float 0.0 to 1.0 (or percentage 0-100) and normalize it to 0-100
  let normConfidence = 86; // fallback
  if (item.confidence != null) {
    normConfidence = item.confidence <= 1.0 ? item.confidence * 100 : item.confidence;
  } else if (item.confidence_score != null) {
    normConfidence = item.confidence_score <= 1.0 ? item.confidence_score * 100 : item.confidence_score;
  }
  const confidenceValue = Math.round(normConfidence);
  const isLowConfidence = confidenceValue < 80;
  
  const s = isLowConfidence 
    ? { bg: "var(--surface)", border: "#f97316", borderWidth: "2px" } 
    : (stateColors[item.is_correct] || stateColors.pending);

  const handleEditClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleApproveClick = () => {
    onToggle(item.id, "correct");
  };

  return (
    <div
      className="animate-chip-reveal rounded-2xl p-4.5 space-y-3.5 transition-all border shadow-sm"
      style={{ 
        background: s.bg, 
        borderColor: s.border,
        borderWidth: s.borderWidth || "1.5px",
        animationDelay: `${Math.min(index * 60, 420)}ms`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-extrabold text-white flex-shrink-0"
            style={{ background: "var(--primary)" }}
          >
            {item.question_no}
          </span>
          <div>
            <p className="text-sm font-bold leading-snug pt-0.5" style={{ color: "var(--text)" }}>
              {item.question_text || "Extracted Question"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLowConfidence ? "bg-orange-100 text-orange-800" : "bg-slate-100 text-slate-700"}`}>
                Confidence: {confidenceValue}%
              </span>
              {isLowConfidence && (
                <span className="text-xs text-orange-600 font-extrabold flex items-center gap-1">
                  ⚠️ Teacher attention needed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ✓ / ? / ✗ toggle */}
        <div className="toggle-group flex-shrink-0">
          <button
            type="button"
            className={`toggle-btn toggle-btn-correct ${item.is_correct === "correct" ? "active" : ""}`}
            onClick={() => onToggle(item.id, "correct")}
            title="Correct / सही"
          >
            ✓
          </button>
          <button
            type="button"
            className={`toggle-btn toggle-btn-pending ${item.is_correct === "pending" ? "active" : ""}`}
            onClick={() => onToggle(item.id, "pending")}
            title="Not checked / बाकी"
          >
            ?
          </button>
          <button
            type="button"
            className={`toggle-btn toggle-btn-incorrect ${item.is_correct === "incorrect" ? "active" : ""}`}
            onClick={() => onToggle(item.id, "incorrect")}
            title="Incorrect / गलत"
          >
            ✗
          </button>
        </div>
      </div>

      {/* Answer fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="field-label">{t("ocrExtractedLabel")}</label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="input input-sm font-medium flex-1"
              value={item.student_answer || ""}
              onChange={e => onChange(item.id, "student_answer", e.target.value)}
              placeholder="Student's written answer…"
            />
            <button
              type="button"
              onClick={handleEditClick}
              className="btn btn-ghost btn-sm font-bold px-3 py-1 text-xs"
              style={{ minHeight: 38 }}
            >
              Edit
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="field-label">{t("correctAnswerLabel")}</label>
          <div className="flex gap-2">
            <input
              className="input input-sm font-medium flex-1"
              value={item.correct_answer || ""}
              onChange={e => onChange(item.id, "correct_answer", e.target.value)}
              placeholder="Expected answer…"
            />
            <button
              type="button"
              onClick={handleApproveClick}
              className="btn btn-primary btn-sm font-bold px-3 py-1 text-xs"
              style={{ minHeight: 38 }}
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WorksheetDetail({ params }) {
  const { id } = params;
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [worksheet, setWorksheet]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [scanUrl, setScanUrl]       = useState(null);

  const [title, setTitle]           = useState("");
  const [studentName, setStudentName] = useState("");
  const [rollNo, setRollNo]         = useState("");
  const [items, setItems]           = useState([]);

  const [saving, setSaving]         = useState(false);
  const [grading, setGrading]       = useState(false);
  const [gradeDone, setGradeDone]   = useState(false);
  const [reOcr, setReOcr]           = useState(false);
  const [analysis, setAnalysis]     = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  const pollRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchAnalysis = useCallback(async () => {
    setAnalysisError("");
    try {
      const res = await api.learning.analyzeWorksheet(id);
      if (res.analyzed) setAnalysis(res.analysis);
    } catch (err) {
      setAnalysisError("Analysis failed: " + err.message);
    }
  }, [id]);

  const load = useCallback(async () => {
    try {
      const data = await api.worksheets.get(id);
      setWorksheet(data);
      setTitle(data.title || "");
      setStudentName(data.student?.name || "");
      setRollNo(data.student?.roll_no || "");
      setItems(data.items || []);
      if (data.status === "ocr_complete" || data.status === "completed") {
        fetchAnalysis();
      }
      return data;
    } catch {
      setError("Could not load this worksheet. Please go back and try again.");
      return null;
    }
  }, [id, fetchAnalysis]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [user, load]);

  // Poll while processing
  useEffect(() => {
    if (!worksheet) return;
    if (worksheet.status === "processing") {
      pollRef.current = setInterval(async () => {
        const fresh = await load();
        if (fresh && fresh.status !== "processing") clearInterval(pollRef.current);
      }, 3000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [worksheet?.status, load]);

  // The scan lives on an auth-protected endpoint, so fetch it as a blob with
  // the JWT (<img> tags cannot send an Authorization header).
  useEffect(() => {
    if (!worksheet?.image_url || !token) return undefined;
    let objectUrl = null;
    fetch(worksheet.image_url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setScanUrl(objectUrl);
      })
      .catch((err) => console.warn("[UI] Could not load worksheet scan:", err));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [worksheet?.image_url, token]);

  const handleItemChange = (itemId, field, value) =>
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, [field]: value } : it));

  const handleToggle = (itemId, value) => {
    setItems(prev => {
      const item = prev.find(it => it.id === itemId);
      
      // AI bias correction logging: from "incorrect" to "correct"
      if (item && item.is_correct === "incorrect" && value === "correct") {
        api.worksheets.logBiasCorrection(id, {
          item_id: item.id,
          question_text: item.question_text || "",
          expected_answer: item.correct_answer || "",
          student_answer: item.student_answer || "",
          original_ai_grade: "incorrect",
          teacher_corrected_grade: "correct"
        }).catch(err => console.error("Failed to log bias correction:", err));
      }
      
      return prev.map(it => it.id === itemId ? { ...it, is_correct: value } : it);
    });
  };

  const savePayload = () => ({
    title,
    student_name: studentName,
    roll_no: rollNo,
    items: items.map(it => ({
      id: it.id,
      student_answer: it.student_answer,
      correct_answer: it.correct_answer,
      is_correct: it.is_correct,
    })),
  });

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await api.worksheets.update(id, savePayload());
      setWorksheet(updated);
      setItems(updated.items || []);
    } catch (err) {
      setError("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGrade = async () => {
    setError("");
    setGrading(true);
    setGradeDone(false);
    try {
      // Save first, then grade
      await api.worksheets.update(id, savePayload());
      const updated = await api.worksheets.grade(id);
      setWorksheet(updated);
      setItems(updated.items || []);
      setGradeDone(true);
      setTimeout(() => setGradeDone(false), 5000);
      // Refresh the Understand panel with corrected data
      fetchAnalysis();
    } catch (err) {
      setError("Grading failed: " + err.message);
    } finally {
      setGrading(false);
    }
  };

  const handleReOcr = async () => {
    setReOcr(true);
    setError("");
    try {
      const updated = await api.worksheets.process(id);
      setWorksheet(updated);
      setItems([]);
    } catch (err) {
      setError("Re-scan failed: " + err.message);
    } finally {
      setReOcr(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="text-center space-y-3">
          <div
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto"
            style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }}
          />
          <p style={{ color: "var(--text-3)" }}>{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!worksheet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="card p-8 text-center space-y-4 max-w-sm">
          <div className="text-5xl">😕</div>
          <p className="font-bold">{t("worksheetNotFound")}</p>
          <Link href="/dashboard" className="btn btn-primary cursor-pointer font-bold">
            ← {t("back")}
          </Link>
        </div>
      </div>
    );
  }

  const isProcessing = worksheet.status === "processing";
  const isCompleted  = worksheet.status === "completed";
  const isFailed     = worksheet.status === "failed";
  const hasItems     = items.length > 0;
  const scorePercent = worksheet.final_score != null ? Math.round(worksheet.final_score) : null;
  const markedCount  = items.filter(it => it.is_correct !== "pending").length;

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />

      <main className="flex-1 overflow-hidden">

        {/* Page Header */}
        <div className="page-header">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 flex-wrap">
              <Link href="/assess" className="btn btn-ghost btn-sm font-bold flex items-center gap-1 cursor-pointer">
                <ArrowLeft size={14} />
                <span>{t("back")}</span>
              </Link>
              <div>
                <h1 className="text-xl font-extrabold">{worksheet.title}</h1>
                {studentName && (
                  <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-3)" }}>
                    {studentName}{rollNo ? ` · ${t("rollLabel")} ${rollNo}` : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {worksheet.assessment_id && (
                <Link href={`/assess/${worksheet.assessment_id}`} className="btn btn-ghost btn-sm font-bold cursor-pointer">
                  <ArrowLeft size={14} /><span>Back to Assessment</span>
                </Link>
              )}
              {analysis && worksheet.class_id && (
                <Link href={`/groups?class=${worksheet.class_id}`} className="btn btn-secondary btn-sm font-bold cursor-pointer">
                  <span>View Groups</span>
                </Link>
              )}
              {(isFailed || (!hasItems && !isProcessing)) && (
                <button
                  onClick={handleReOcr}
                  disabled={reOcr}
                  className="btn btn-ghost btn-sm font-bold cursor-pointer"
                >
                  <RefreshCw size={14} className={reOcr ? "animate-spin" : ""} />
                  <span>{reOcr ? t("scanning") : t("rescan")}</span>
                </button>
              )}
              {hasItems && !isProcessing && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-ghost btn-sm font-bold cursor-pointer"
                    form="review-form"
                    type="submit"
                  >
                    <Save size={14} />
                    <span>{saving ? t("saving") : t("save")}</span>
                  </button>
                  <button
                    onClick={handleGrade}
                    disabled={grading}
                    className="btn btn-primary btn-sm font-bold cursor-pointer shadow-sm"
                  >
                    {grading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>{t("analysing")}</span>
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        <span>{t("gradeNowBtn")}</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-6 space-y-6">

          {/* Status bar */}
          <StatusBar status={worksheet.status} t={t} />

          {/* Understand panel — evidence engine output with teacher-in-the-loop */}
          {analysis && !isProcessing && (
            <UnderstandPanel worksheetId={id} analysis={analysis} onChanged={fetchAnalysis} />
          )}

          {error && (
            <ApiStatusBanner
              variant="error"
              title={error}
              message="Check your connection — your data is safe."
              retryLabel="Reload"
              onRetry={() => {
                setLoading(true);
                load().finally(() => setLoading(false));
              }}
              retrying={loading}
            />
          )}

          {isFailed && (
            <ApiStatusBanner
              variant="ocr-failed"
              title={t("failedText")}
              message="The AI could not read this scan. Retrying usually fixes it — your image is safe."
              retryLabel="Retry Scan"
              onRetry={handleReOcr}
              retrying={reOcr}
            />
          )}

          {analysisError && (
            <ApiStatusBanner
              variant="error"
              title={analysisError}
              retryLabel="Retry Analysis"
              onRetry={fetchAnalysis}
            />
          )}

          {/* Grade success alert — pops with a ripple when analysis lands */}
          {gradeDone && (
            <div className="alert alert-success animate-pop-in">
              <span className="relative flex-shrink-0">
                <span className="animate-ripple absolute inset-0 rounded-full" style={{ background: "var(--success)" }} />
                <Check size={18} className="relative text-emerald-600" />
              </span>
              <span>{t("gradeSuccessAlert")}</span>
            </div>
          )}

          {/* Progress row */}
          {hasItems && !isProcessing && (
            <div
              className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-slate-100 bg-white"
            >
              <div className="space-y-2 flex-1 min-w-0 w-full">
                <div className="flex justify-between text-sm font-bold">
                  <span style={{ color: "var(--text-2)" }}>
                    {t("markingProgress")}
                  </span>
                  <span style={{ color: "var(--text-3)" }}>
                    {markedCount} / {items.length} {t("answersMarked")}
                  </span>
                </div>
                <div className="score-bar-track">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${(markedCount / items.length) * 100}%` }}
                  />
                </div>
              </div>
              {scorePercent !== null && (
                <div
                  key={scorePercent}
                  className="animate-pop-in text-3xl font-extrabold px-5 py-2.5 rounded-2xl flex-shrink-0 shadow-sm border"
                  style={{
                    background: scorePercent >= 80 ? "var(--success-light)" : scorePercent >= 50 ? "var(--warning-light)" : "var(--error-light)",
                    color: scorePercent >= 80 ? "var(--success)" : scorePercent >= 50 ? "var(--warning)" : "var(--error)",
                    borderColor: scorePercent >= 80 ? "rgba(16, 185, 129, 0.2)" : scorePercent >= 50 ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  }}
                >
                  {scorePercent}%
                </div>
              )}
            </div>
          )}

          {/* Split layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

            {/* ── Left: Image + AI Feedback ── */}
            <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-24">

              {/* Scan preview */}
              <div className="card overflow-hidden border-slate-100 bg-white">
                <div
                  className="px-4.5 py-3.5 flex items-center gap-2 bg-slate-50"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <FileImage size={16} className="text-slate-400" />
                  <span className="text-sm font-bold" style={{ color: "var(--text-2)" }}>
                    {t("originalScan")}
                  </span>
                </div>
                <div
                  className="flex items-center justify-center min-h-64 max-h-[500px] overflow-y-auto"
                  style={{ background: "#f8fafc" }}
                >
                  {scanUrl ? (
                    <img
                      src={scanUrl}
                      alt="Worksheet scan"
                      className="max-w-full h-auto"
                    />
                  ) : worksheet.image_url ? (
                    <div className="py-12 text-sm font-semibold" style={{ color: "var(--text-4)" }}>
                      Loading scan…
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-2">
                      <div className="text-slate-300">
                        <FileImage size={32} className="mx-auto" />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-4)" }}>{t("noImageText")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Feedback Box */}
              {isCompleted && worksheet.ai_feedback && (
                <div className="card p-5 space-y-6 border-slate-100 bg-white">
                  <div
                    className="flex items-center gap-2.5 pb-3.5"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <Sparkles size={18} className="text-[#F59E0B]" />
                    <div>
                      <h3 className="font-extrabold text-base">{t("aiFeedback")}</h3>
                    </div>
                  </div>

                  {/* Score progress bar */}
                  {scorePercent !== null && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span style={{ color: "var(--text-2)" }}>{t("scoreLabel")}</span>
                        <span className="text-sm font-extrabold" style={{
                          color: scorePercent >= 80 ? "var(--success)" : scorePercent >= 50 ? "var(--warning)" : "var(--error)"
                        }}>
                          {scorePercent}%
                        </span>
                      </div>
                      <div className="score-bar-track">
                        <div className="score-bar-fill" style={{ width: `${scorePercent}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Feedback text */}
                  {worksheet.ai_feedback.feedback && (
                    <div className="space-y-2">
                      <p className="section-title">{t("studentLabel")} Feedback</p>
                      <div
                        className="p-4 rounded-2xl text-sm font-semibold leading-relaxed italic border"
                        style={{ background: "var(--bg)", color: "var(--text-2)", borderColor: "var(--border)" }}
                      >
                        "{worksheet.ai_feedback.feedback}"
                      </div>
                    </div>
                  )}

                  {/* Learning gaps list */}
                  {worksheet.ai_feedback.learning_gaps?.length > 0 && (
                    <div className="space-y-2">
                      <p className="section-title">{t("learningGapsTitle")}</p>
                      <div className="space-y-2.5">
                        {worksheet.ai_feedback.learning_gaps.map((gap, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-2xl border flex gap-3 items-start"
                            style={{ background: "var(--error-light)", borderColor: "rgba(239, 68, 68, 0.15)" }}
                          >
                            <TrendingUp size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-bold" style={{ color: "var(--error-text)" }}>
                                {gap.concept}
                              </p>
                              <p className="text-sm leading-relaxed mt-1" style={{ color: "var(--error-text)", opacity: 0.85 }}>
                                {gap.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remedial Suggestions */}
                  {worksheet.ai_feedback.remedial_suggestions && (
                    <div className="space-y-2">
                      <p className="section-title">{t("remedialSuggestions")}</p>
                      <div
                        className="p-4 rounded-2xl text-sm font-semibold leading-relaxed border flex gap-3 items-start"
                        style={{ background: "var(--primary-light)", color: "var(--primary-dark)", borderColor: "rgba(20, 184, 166, 0.15)" }}
                      >
                        <BookOpen size={16} className="text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          {worksheet.ai_feedback.remedial_suggestions}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Right: Question Checklist Review Form ── */}
            <div className="lg:col-span-3">
              <form id="review-form" onSubmit={handleSave}>
                <div className="card p-5 space-y-6 border-slate-100 bg-white">

                  <div>
                    <h3 className="font-extrabold text-lg">What Kagaz Read</h3>
                    <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-3)" }}>
                      Correct anything the scanner misread — your correction updates the learning analysis. Mark ✓ / ✗ / ?, then run Understand.
                    </p>
                  </div>

                  {/* Student info fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="field-label">{t("studentNameLabel")}</label>
                      <input
                        className="input"
                        value={studentName}
                        onChange={e => setStudentName(e.target.value)}
                        placeholder="e.g. Ms. Priya Sharma"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="field-label">{t("rollNumberLabel")}</label>
                      <input
                        className="input"
                        value={rollNo}
                        onChange={e => setRollNo(e.target.value)}
                        placeholder="e.g. 14"
                      />
                    </div>
                  </div>

                  {/* Processing — scan-beam mock mirrors the onboarding moment */}
                  {isProcessing && (
                    <div className="py-6 space-y-4 animate-fade-in">
                      <div className="relative bg-white px-6 py-5 rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
                        <div className="space-y-3">
                          {["Q1. 23 + 14 = …", "Q2. 45 − 21 = …", "Q3. 42 − 17 = …"].map((l, i) => (
                            <div key={i} className="skeleton h-4 rounded" style={{ width: `${88 - i * 14}%` }} />
                          ))}
                        </div>
                        <div
                          className="animate-scan-beam absolute left-0 right-0 h-1 rounded-full pointer-events-none"
                          style={{
                            background: "linear-gradient(90deg, transparent, var(--primary), transparent)",
                            boxShadow: "0 0 12px 2px rgba(15, 118, 110, 0.45)",
                          }}
                        />
                      </div>
                      <div className="flex flex-col items-center space-y-2">
                        <p className="font-bold text-sm" style={{ color: "var(--text-2)" }}>
                          {t("readingHandwriting")}
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-3)" }}>
                          {t("readingSubText")}
                        </p>
                        <div className="h-1 w-48 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="animate-indeterminate h-full w-1/3 rounded-full" style={{ background: "var(--primary)" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* No items fallback */}
                  {!isProcessing && !hasItems && (
                    <div className="text-center py-12 space-y-3">
                      <div className="text-slate-300">
                        <AlertCircle size={36} className="mx-auto" />
                      </div>
                      <p className="font-bold text-sm" style={{ color: "var(--text-2)" }}>
                        {isFailed
                          ? (worksheet.ai_feedback?.error ? "OCR Crash: " + worksheet.ai_feedback.error : t("ocrFailedRead"))
                          : t("noAnswersExtracted")}
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-3)", whiteSpace: "pre-wrap", overflowX: "auto" }}>
                        {isFailed
                          ? (worksheet.ai_feedback?.traceback || t("ocrFailedReadSub"))
                          : t("noAnswersSubText")}
                      </p>
                    </div>
                  )}

                  {/* Question cards loop — staggered reveal as OCR lands */}
                  {hasItems && !isProcessing && (
                    <div className="space-y-4">
                      {items.map((item, idx) => (
                        <QuestionCard
                          key={item.id}
                          item={item}
                          index={idx}
                          onChange={handleItemChange}
                          onToggle={handleToggle}
                          t={t}
                        />
                      ))}
                    </div>
                  )}

                  {/* Worksheet title input */}
                  {hasItems && (
                    <div className="space-y-1">
                      <label className="field-label">{t("worksheetTitleLabel")}</label>
                      <input
                        className="input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  {/* Actions footer */}
                  {hasItems && !isProcessing && (
                    <div
                      className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5"
                      style={{ borderTop: "1.5px solid var(--border)" }}
                    >
                      <p className="text-sm font-bold" style={{ color: "var(--text-4)" }}>
                        {markedCount} / {items.length} {t("answersMarked")}
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={saving}
                          className="btn btn-secondary cursor-pointer"
                        >
                          {saving ? t("saving") : t("saveEditsBtn")}
                        </button>
                        <button
                          type="button"
                          onClick={handleGrade}
                          disabled={grading}
                          className="btn btn-primary cursor-pointer"
                        >
                          {grading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>{t("analysing")}</span>
                            </>
                          ) : (
                            <>
                              <Zap size={16} />
                              <span>{t("gradeNowBtn")}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
