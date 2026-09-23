"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Plus,
  Trash2,
  Edit3,
  Filter,
  RefreshCw,
  Upload,
  ClipboardCheck,
  Eye,
  Brain,
  Lightbulb,
  Timer,
} from "lucide-react";

const COMPETENCY_OPTIONS = [
  "counting_1_10",
  "counting_11_20",
  "number_recognition",
  "number_composition",
  "addition_no_regroup",
  "subtraction_no_regroup",
  "addition_regroup",
  "subtraction_regroup",
  "place_value",
  "skip_counting",
  "multiplication_concept",
  "division_concept",
];

const COMPETENCY_LABELS = {
  counting_1_10: "Counting 1–10",
  counting_11_20: "Counting 11–20",
  number_recognition: "Number Recognition",
  number_composition: "Number Composition",
  addition_no_regroup: "Addition (no regroup)",
  subtraction_no_regroup: "Subtraction (no regroup)",
  addition_regroup: "Addition (with regroup)",
  subtraction_regroup: "Subtraction (with regroup)",
  place_value: "Place Value",
  skip_counting: "Skip Counting",
  multiplication_concept: "Multiplication Concept",
  division_concept: "Division Concept",
};

function MetricCard({ label, value, evaluated, icon: Icon, color }) {
  const isNull = value === null || value === undefined;
  const pct = isNull ? null : Math.round(value * 100);
  return (
    <div
      className="bg-white rounded-2xl border-2 border-slate-200 p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          <Icon size={18} />
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div>
        <p className="text-3xl font-black" style={{ color: isNull ? "#94a3b8" : color }}>
          {isNull ? "—" : `${pct}%`}
        </p>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          {isNull
            ? "Not enough data"
            : `${evaluated} record${evaluated !== 1 ? "s" : ""} evaluated`}
        </p>
      </div>
    </div>
  );
}

function MetricRow({ label, value, evaluated, unit = "" }) {
  const isNull = value === null || value === undefined;
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="text-sm font-bold text-slate-900">
        {isNull ? (
          <span className="text-slate-400">Not enough data</span>
        ) : unit === "ms" ? (
          `${Math.round(value)}ms avg`
        ) : unit === "rate" ? (
          `${Math.round(value * 100)}%`
        ) : (
          `${value}`
        )}
      </span>
    </div>
  );
}

export default function EvaluationPage() {
  const [metrics, setMetrics] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [exportData, setExportData] = useState(null);

  // Form state
  const [form, setForm] = useState({
    student_name: "",
    ai_extracted_answer: "",
    teacher_corrected_answer: "",
    ocr_was_correct: null,
    ai_competency: "",
    ground_truth_competency: "",
    competency_match: null,
    ai_learning_gap: "",
    teacher_confirmed_gap: "",
    gap_agrees: null,
    confidence: "medium",
    recommendation: "",
    teacher_accepted_recommendation: null,
    processing_time_ms: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r] = await Promise.all([
        api.learning.getEvaluationMetrics(),
        api.learning.getEvaluationRecords(),
      ]);
      setMetrics(m);
      setRecords(r);
    } catch (err) {
      console.error("Failed to load evaluation data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm({
      student_name: "",
      ai_extracted_answer: "",
      teacher_corrected_answer: "",
      ocr_was_correct: null,
      ai_competency: "",
      ground_truth_competency: "",
      competency_match: null,
      ai_learning_gap: "",
      teacher_confirmed_gap: "",
      gap_agrees: null,
      confidence: "medium",
      recommendation: "",
      teacher_accepted_recommendation: null,
      processing_time_ms: "",
      notes: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        ai_competency: form.ai_competency || null,
        ground_truth_competency: form.ground_truth_competency || null,
        ai_extracted_answer: form.ai_extracted_answer || null,
        teacher_corrected_answer: form.teacher_corrected_answer || null,
        ai_learning_gap: form.ai_learning_gap || null,
        teacher_confirmed_gap: form.teacher_confirmed_gap || null,
        recommendation: form.recommendation || null,
        processing_time_ms: form.processing_time_ms ? parseFloat(form.processing_time_ms) : null,
        student_name: form.student_name || null,
      };

      if (editingId) {
        // For edits, only send the teacher ground-truth fields
        await api.learning.updateEvaluationRecord(editingId, {
          teacher_corrected_answer: payload.teacher_corrected_answer,
          ocr_was_correct: payload.ocr_was_correct,
          ground_truth_competency: payload.ground_truth_competency,
          competency_match: payload.competency_match,
          teacher_confirmed_gap: payload.teacher_confirmed_gap,
          gap_agrees: payload.gap_agrees,
          teacher_accepted_recommendation: payload.teacher_accepted_recommendation,
          notes: payload.notes,
        });
      } else {
        await api.learning.createEvaluationRecord(payload);
      }
      resetForm();
      setShowForm(false);
      loadData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this evaluation record?")) return;
    try {
      await api.learning.deleteEvaluationRecord(id);
      loadData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleEdit = (rec) => {
    setForm({
      student_name: rec.student_name || "",
      ai_extracted_answer: rec.ai_extracted_answer || "",
      teacher_corrected_answer: rec.teacher_corrected_answer || "",
      ocr_was_correct: rec.ocr_was_correct,
      ai_competency: rec.ai_competency || "",
      ground_truth_competency: rec.ground_truth_competency || "",
      competency_match: rec.competency_match,
      ai_learning_gap: rec.ai_learning_gap || "",
      teacher_confirmed_gap: rec.teacher_confirmed_gap || "",
      gap_agrees: rec.gap_agrees,
      confidence: rec.confidence || "medium",
      recommendation: rec.recommendation || "",
      teacher_accepted_recommendation: rec.teacher_accepted_recommendation,
      processing_time_ms: rec.processing_time_ms || "",
      notes: rec.notes || "",
    });
    setEditingId(rec.id);
    setShowForm(true);
  };

  const handleExport = async () => {
    try {
      const data = await api.learning.getEvaluationExport();
      setExportData(data);
      // Also trigger download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kagaz-evaluation-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleImportDemo = async () => {
    // Generate a few sample records for testing
    const samples = [
      {
        student_name: "Aarav Mehta",
        ai_extracted_answer: "33",
        teacher_corrected_answer: "33",
        ocr_was_correct: true,
        ai_competency: "addition_no_regroup",
        ground_truth_competency: "addition_no_regroup",
        competency_match: true,
        ai_learning_gap: "Carry-over error pattern detected",
        teacher_confirmed_gap: "Carry-over error pattern detected",
        gap_agrees: true,
        confidence: "medium",
        recommendation: "10-minute counters activity for regrouping",
        teacher_accepted_recommendation: true,
        processing_time_ms: 4200,
      },
      {
        student_name: "Priya Sharma",
        ai_extracted_answer: "44",
        teacher_corrected_answer: "44",
        ocr_was_correct: true,
        ai_competency: "subtraction_regroup",
        ground_truth_competency: "subtraction_regroup",
        competency_match: true,
        ai_learning_gap: "Borrow error — units subtracted bottom-to-top",
        teacher_confirmed_gap: "Borrow error — units subtracted bottom-to-top",
        gap_agrees: true,
        confidence: "high",
        recommendation: "Sticks bundling activity for borrowing",
        teacher_accepted_recommendation: true,
        processing_time_ms: 3800,
      },
      {
        student_name: "Rohan Patel",
        ai_extracted_answer: "7",
        teacher_corrected_answer: null,
        ocr_was_correct: null,
        ai_competency: "counting_1_10",
        ground_truth_competency: "number_recognition",
        competency_match: false,
        ai_learning_gap: "Number recognition weak",
        teacher_confirmed_gap: "Number recognition strong — counting is the gap",
        gap_agrees: false,
        confidence: "needs_verification",
        recommendation: "Number card matching activity",
        teacher_accepted_recommendation: false,
        processing_time_ms: 5100,
      },
    ];

    for (const s of samples) {
      try {
        await api.learning.createEvaluationRecord(s);
      } catch (err) {
        console.error("Import error", err);
      }
    }
    loadData();
  };

  const csvFileRef = React.useRef(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);
    setCsvResult(null);
    try {
      const result = await api.learning.importEvaluationCSV(file);
      setCsvResult(result);
      loadData();
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setCsvUploading(false);
      if (csvFileRef.current) csvFileRef.current.value = "";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-300">
              Internal Only
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Evaluation & Testing</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Measure whether Kagaz AI decisions are actually correct. For the development team only.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <input
            ref={csvFileRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
          />
          <button
            onClick={() => csvFileRef.current?.click()}
            disabled={csvUploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#0F766E] text-white hover:bg-[#0d6559] cursor-pointer disabled:opacity-50"
          >
            {csvUploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#1E3A8A] text-white hover:bg-[#172554] cursor-pointer"
          >
            <Download size={14} />
            Export JSON
          </button>
        </div>        </div>

      {/* CSV import result feedback */}
      {csvResult && (
        <div className="bg-[#0F766E]/5 border-2 border-[#0F766E]/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-[#0F766E] flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#0F766E]">
                CSV Import Complete: {csvResult.imported} record{csvResult.imported !== 1 ? "s" : ""} imported
                {csvResult.skipped > 0 && `, ${csvResult.skipped} skipped`}
              </p>
              {csvResult.errors?.length > 0 && (
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {csvResult.errors.slice(0, 3).join("; ")}
                  {csvResult.errors.length > 3 && ` … and ${csvResult.errors.length - 3} more`}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setCsvResult(null)}
            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* ── Metrics Dashboard ──────────────────────────────────────── */}
          {metrics && metrics.metrics ? (
            <div className="space-y-6">
              {/* Summary banner */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
                <h2 className="text-lg font-black text-slate-900 mb-4">Prototype Metrics</h2>
                <p className="text-xs text-slate-500 font-semibold mb-6">
                  Based on {metrics.total_records} evaluation record{metrics.total_records !== 1 ? "s" : ""}.
                  These measure observed agreement with teacher judgment — not proven causation.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    label="OCR Accuracy"
                    value={metrics.metrics.ocr_accuracy}
                    evaluated={metrics.metrics.ocr_evaluated_count}
                    icon={Eye}
                    color="#1E3A8A"
                  />
                  <MetricCard
                    label="Competency Accuracy"
                    value={metrics.metrics.competency_accuracy}
                    evaluated={metrics.metrics.competency_evaluated_count}
                    icon={Brain}
                    color="#0F766E"
                  />
                  <MetricCard
                    label="Gap Agreement"
                    value={metrics.metrics.gap_agreement}
                    evaluated={metrics.metrics.gap_evaluated_count}
                    icon={ClipboardCheck}
                    color="#7C3AED"
                  />
                  <MetricCard
                    label="Recommendation Acceptance"
                    value={metrics.metrics.recommendation_acceptance}
                    evaluated={metrics.metrics.recommendation_evaluated_count}
                    icon={Lightbulb}
                    color="#16A34A"
                  />
                </div>
              </div>

              {/* Detailed metrics */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
                <h3 className="text-sm font-black text-slate-900 mb-3">Detailed Metrics</h3>
                <div className="divide-y divide-slate-100">
                  <MetricRow
                    label="OCR Accuracy"
                    value={metrics.metrics.ocr_accuracy}
                    evaluated={metrics.metrics.ocr_evaluated_count}
                    unit="rate"
                  />
                  <MetricRow
                    label="Competency Classification Accuracy"
                    value={metrics.metrics.competency_accuracy}
                    evaluated={metrics.metrics.competency_evaluated_count}
                    unit="rate"
                  />
                  <MetricRow
                    label="Learning-Gap Agreement with Teacher"
                    value={metrics.metrics.gap_agreement}
                    evaluated={metrics.metrics.gap_evaluated_count}
                    unit="rate"
                  />
                  <MetricRow
                    label="Recommendation Acceptance Rate"
                    value={metrics.metrics.recommendation_acceptance}
                    evaluated={metrics.metrics.recommendation_evaluated_count}
                    unit="rate"
                  />
                  <MetricRow
                    label="Teacher Correction Rate"
                    value={metrics.metrics.correction_rate}
                    evaluated={metrics.metrics.ocr_total_count}
                    unit="rate"
                  />
                  <MetricRow
                    label="Average Processing Time"
                    value={metrics.metrics.avg_processing_time_ms}
                    evaluated={metrics.metrics.timed_count}
                    unit="ms"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center space-y-4">
              <AlertTriangle size={32} className="mx-auto text-amber-400" />
              <h3 className="text-lg font-black text-slate-700">Not enough evaluation data.</h3>
              <p className="text-sm text-slate-500 font-semibold max-w-md mx-auto">
                Add evaluation records below to start measuring AI accuracy.
                Each record compares one AI prediction against teacher ground truth.
              </p>          <button
                onClick={handleImportDemo}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-300 cursor-pointer"
              >
                <Plus size={14} />
                Import Sample Records
              </button>
              <button
                onClick={() => csvFileRef.current?.click()}
                disabled={csvUploading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#0F766E]/10 text-[#0F766E] hover:bg-[#0F766E]/20 border border-[#0F766E]/30 cursor-pointer disabled:opacity-50"
              >
                {csvUploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                Import CSV File
              </button>
            </div>
          )}

          {/* ── Add / Edit Record Form ────────────────────────────────── */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
            <button
              onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-[#1E3A8A]" />
                <span className="text-sm font-black text-slate-900">
                  {editingId ? "Edit Evaluation Record" : "Add Evaluation Record"}
                </span>
              </div>
              <span className="text-xs text-slate-400">{showForm ? "▲" : "▼"}</span>
            </button>

            {showForm && (
              <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6 border-t border-slate-100 pt-4">
                {/* Student & OCR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Student Name</label>
                    <input
                      type="text"
                      value={form.student_name}
                      onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-semibold focus:outline-none focus:border-[#1E3A8A]"
                      placeholder="e.g. Aarav Mehta"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Confidence</label>
                    <select
                      value={form.confidence}
                      onChange={(e) => setForm({ ...form, confidence: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-semibold focus:outline-none focus:border-[#1E3A8A]"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="needs_verification">Needs Verification</option>
                    </select>
                  </div>
                </div>

                {/* OCR Section */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider">OCR Extraction</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">AI Extracted Answer</label>
                      <input
                        type="text"
                        value={form.ai_extracted_answer}
                        onChange={(e) => setForm({ ...form, ai_extracted_answer: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-mono focus:outline-none focus:border-[#1E3A8A]"
                        placeholder="e.g. 33"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Teacher-Corrected Answer</label>
                      <input
                        type="text"
                        value={form.teacher_corrected_answer}
                        onChange={(e) => setForm({ ...form, teacher_corrected_answer: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-mono focus:outline-none focus:border-[#1E3A8A]"
                        placeholder="e.g. 33"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">OCR Correct?</label>
                      <div className="flex gap-2 mt-1">
                        {[
                          { val: true, label: "Yes", color: "#16A34A" },
                          { val: false, label: "No", color: "#DC2626" },
                          { val: null, label: "N/A", color: "#94a3b8" },
                        ].map((opt) => (
                          <button
                            key={String(opt.val)}
                            type="button"
                            onClick={() => setForm({ ...form, ocr_was_correct: opt.val })}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border-2 cursor-pointer transition-all"
                            style={{
                              background: form.ocr_was_correct === opt.val ? `${opt.color}15` : "white",
                              borderColor: form.ocr_was_correct === opt.val ? opt.color : "#e2e8f0",
                              color: form.ocr_was_correct === opt.val ? opt.color : "#64748b",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Competency Section */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-black text-[#0F766E] uppercase tracking-wider">Competency Classification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">AI Predicted Competency</label>
                      <select
                        value={form.ai_competency}
                        onChange={(e) => setForm({ ...form, ai_competency: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-semibold focus:outline-none focus:border-[#0F766E]"
                      >
                        <option value="">— Select —</option>
                        {COMPETENCY_OPTIONS.map((c) => (
                          <option key={c} value={c}>{COMPETENCY_LABELS[c]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Ground-Truth Competency</label>
                      <select
                        value={form.ground_truth_competency}
                        onChange={(e) => setForm({ ...form, ground_truth_competency: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-semibold focus:outline-none focus:border-[#0F766E]"
                      >
                        <option value="">— Select —</option>
                        {COMPETENCY_OPTIONS.map((c) => (
                          <option key={c} value={c}>{COMPETENCY_LABELS[c]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Competency Match?</label>
                      <div className="flex gap-2 mt-1">
                        {[
                          { val: true, label: "Match", color: "#16A34A" },
                          { val: false, label: "Mismatch", color: "#DC2626" },
                          { val: null, label: "N/A", color: "#94a3b8" },
                        ].map((opt) => (
                          <button
                            key={String(opt.val)}
                            type="button"
                            onClick={() => setForm({ ...form, competency_match: opt.val })}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border-2 cursor-pointer transition-all"
                            style={{
                              background: form.competency_match === opt.val ? `${opt.color}15` : "white",
                              borderColor: form.competency_match === opt.val ? opt.color : "#e2e8f0",
                              color: form.competency_match === opt.val ? opt.color : "#64748b",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Learning Gap Section */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-black text-[#7C3AED] uppercase tracking-wider">Learning-Gap Prediction</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">AI Learning-Gap Description</label>
                      <input
                        type="text"
                        value={form.ai_learning_gap}
                        onChange={(e) => setForm({ ...form, ai_learning_gap: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-semibold focus:outline-none focus:border-[#7C3AED]"
                        placeholder="e.g. Borrow error pattern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Teacher-Confirmed Gap (leave blank = agrees)</label>
                      <input
                        type="text"
                        value={form.teacher_confirmed_gap}
                        onChange={(e) => setForm({ ...form, teacher_confirmed_gap: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-semibold focus:outline-none focus:border-[#7C3AED]"
                        placeholder="Leave blank if teacher agrees"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Gap Agrees?</label>
                      <div className="flex gap-2 mt-1">
                        {[
                          { val: true, label: "Agrees", color: "#16A34A" },
                          { val: false, label: "Disagrees", color: "#DC2626" },
                          { val: null, label: "N/A", color: "#94a3b8" },
                        ].map((opt) => (
                          <button
                            key={String(opt.val)}
                            type="button"
                            onClick={() => setForm({ ...form, gap_agrees: opt.val })}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border-2 cursor-pointer transition-all"
                            style={{
                              background: form.gap_agrees === opt.val ? `${opt.color}15` : "white",
                              borderColor: form.gap_agrees === opt.val ? opt.color : "#e2e8f0",
                              color: form.gap_agrees === opt.val ? opt.color : "#64748b",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendation Section */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-black text-[#16A34A] uppercase tracking-wider">Recommendation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">AI Recommendation</label>
                      <input
                        type="text"
                        value={form.recommendation}
                        onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-semibold focus:outline-none focus:border-[#16A34A]"
                        placeholder="e.g. 10-minute counters activity"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Teacher Accepted?</label>
                      <div className="flex gap-2 mt-1">
                        {[
                          { val: true, label: "Accepted", color: "#16A34A" },
                          { val: false, label: "Rejected", color: "#DC2626" },
                          { val: null, label: "N/A", color: "#94a3b8" },
                        ].map((opt) => (
                          <button
                            key={String(opt.val)}
                            type="button"
                            onClick={() => setForm({ ...form, teacher_accepted_recommendation: opt.val })}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border-2 cursor-pointer transition-all"
                            style={{
                              background: form.teacher_accepted_recommendation === opt.val ? `${opt.color}15` : "white",
                              borderColor: form.teacher_accepted_recommendation === opt.val ? opt.color : "#e2e8f0",
                              color: form.teacher_accepted_recommendation === opt.val ? opt.color : "#64748b",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Processing Time (ms)</label>
                      <input
                        type="number"
                        value={form.processing_time_ms}
                        onChange={(e) => setForm({ ...form, processing_time_ms: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-mono focus:outline-none focus:border-[#16A34A]"
                        placeholder="e.g. 4200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Notes</label>
                      <input
                        type="text"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-semibold focus:outline-none focus:border-[#16A34A]"
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl text-sm font-black bg-[#1E3A8A] text-white hover:bg-[#172554] cursor-pointer transition-colors"
                  >
                    {editingId ? "Update Record" : "Add Record"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { resetForm(); setShowForm(false); }}
                    className="px-6 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── Records Table ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                Evaluation Records ({records.length})
              </h3>
              {records.length > 0 && (
                <button
                  onClick={() => { setShowForm(true); resetForm(); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1E3A8A]/10 text-[#1E3A8A] hover:bg-[#1E3A8A]/20 cursor-pointer"
                >
                  <Plus size={12} />
                  Add Record
                </button>
              )}
            </div>

            {records.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <ClipboardCheck size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-400 font-semibold">No evaluation records yet.</p>
                <p className="text-xs text-slate-400 mt-1">Add your first record above or import sample data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">OCR</th>
                      <th className="px-4 py-3 text-left">Competency</th>
                      <th className="px-4 py-3 text-left">Gap</th>
                      <th className="px-4 py-3 text-left">Rec.</th>
                      <th className="px-4 py-3 text-left">Conf.</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                          {rec.student_name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {rec.ocr_was_correct === true && (
                            <span className="inline-flex items-center gap-1 text-[#16A34A] font-bold">
                              <CheckCircle2 size={12} /> Correct
                            </span>
                          )}
                          {rec.ocr_was_correct === false && (
                            <span className="inline-flex items-center gap-1 text-[#DC2626] font-bold">
                              <XCircle size={12} /> Wrong
                            </span>
                          )}
                          {rec.ocr_was_correct === null && (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rec.competency_match === true && (
                            <span className="inline-flex items-center gap-1 text-[#16A34A] font-bold">
                              <CheckCircle2 size={12} /> Match
                            </span>
                          )}
                          {rec.competency_match === false && (
                            <span className="inline-flex items-center gap-1 text-[#DC2626] font-bold">
                              <XCircle size={12} /> Mismatch
                            </span>
                          )}
                          {rec.competency_match === null && (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rec.gap_agrees === true && (
                            <span className="inline-flex items-center gap-1 text-[#16A34A] font-bold">
                              <CheckCircle2 size={12} /> Agrees
                            </span>
                          )}
                          {rec.gap_agrees === false && (
                            <span className="inline-flex items-center gap-1 text-[#DC2626] font-bold">
                              <XCircle size={12} /> Disagrees
                            </span>
                          )}
                          {rec.gap_agrees === null && (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rec.teacher_accepted_recommendation === true && (
                            <span className="inline-flex items-center gap-1 text-[#16A34A] font-bold">
                              <CheckCircle2 size={12} /> Yes
                            </span>
                          )}
                          {rec.teacher_accepted_recommendation === false && (
                            <span className="inline-flex items-center gap-1 text-[#DC2626] font-bold">
                              <XCircle size={12} /> No
                            </span>
                          )}
                          {rec.teacher_accepted_recommendation === null && (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              background:
                                rec.confidence === "high" ? "#16A34A15"
                                : rec.confidence === "needs_verification" ? "#F59E0B15"
                                : "#e2e8f0",
                              color:
                                rec.confidence === "high" ? "#16A34A"
                                : rec.confidence === "needs_verification" ? "#D97706"
                                : "#64748b",
                            }}
                          >
                            {rec.confidence || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(rec)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#1E3A8A] cursor-pointer transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(rec.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-[#DC2626] cursor-pointer transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Export preview ─────────────────────────────────────────── */}
          {exportData && (
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Last Export Preview</h3>
                <button
                  onClick={() => setExportData(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <pre className="text-xs text-slate-600 font-mono bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto max-h-64">
                {JSON.stringify(exportData.summary, null, 2)}
              </pre>
            </div>
          )}

          {/* ── CSV Format Help ──────────────────────────────────────── */}
          <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6 space-y-3">
            <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
              <Download size={14} className="text-slate-400" />
              CSV Format Reference
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              Upload a CSV with these column headers (case-insensitive). Extra columns are ignored.
              Rows without a <code className="bg-slate-200 px-1 rounded">student_name</code> are skipped.
            </p>
            <div className="overflow-x-auto">
              <pre className="text-[11px] text-slate-600 font-mono bg-white p-4 rounded-xl border border-slate-200 whitespace-pre">
{`student_name,ai_extracted_answer,teacher_corrected_answer,ocr_was_correct,ai_competency,ground_truth_competency,competency_match,ai_learning_gap,teacher_confirmed_gap,gap_agrees,confidence,recommendation,teacher_accepted_recommendation,processing_time_ms,notes
Aarav Mehta,33,33,true,addition_no_regroup,addition_no_regroup,true,Carry-over error,Carry-over error,true,medium,10-min counters,true,4200,`}
              </pre>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">
              Boolean fields accept: true/false, yes/no, 1/0, correct/incorrect, match/mismatch, agrees/disagrees, accepted/rejected
            </p>
          </div>
        </>
      )}
    </div>
  );
}
