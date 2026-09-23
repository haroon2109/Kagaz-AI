"use client";
import React, { useState } from "react";
import { HelpCircle, Check, Pencil, SearchCheck } from "lucide-react";
import { api } from "@/lib/api";

/* EvidenceWhy: accessible Why?/View Evidence for one recommendation. */
export function EvidenceWhy(p) {
  const pattern = p.pattern;
  const worksheetId = p.worksheetId;
  const studentId = p.studentId;
  const evidenceId = p.evidenceId;
  const onAction = p.onAction || p.onChanged;
  const [open, setOpen] = useState(p.defaultOpen || false);
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);
  const [editNote, setEditNote] = useState("");
  const [editing, setEditing] = useState(false);
  const items = (pattern || {}).items || [];
  if (!pattern) return null;
  const supporting = pattern.supporting_count ?? items.length;
  const total = pattern.total_questions ?? items.length;
  const strength = pattern.evidence_strength
    || (pattern.confidence === "high" ? "High"
      : pattern.confidence === "medium" ? "Medium" : "Insufficient");
  const needsVerify = pattern.needs_teacher_verification
    ?? pattern.confidence !== "high";
  const strengthCls = strength === "High" ? "chip chip-success"
    : strength === "Medium" ? "chip chip-warning" : "chip chip-error";

  const send = async (verdict, note) => {
    setBusy(verdict);
    try {
      try {
        await api.learning.sendPatternFeedback({
          pattern_type: pattern.type || "pattern",
          ai_prediction: pattern.possible_gap || pattern.pattern_description || "",
          teacher_label: verdict === "verify" ? "incorrect" : "correct",
          reason: verdict === "verify" ? "Teacher requested more evidence"
            : verdict === "edited" ? (note || editNote || "Teacher edited inference") : undefined,
          student_id: studentId || undefined,
          worksheet_id: worksheetId || undefined,
        });
      } catch (e) {}
      if (evidenceId) {
        await api.learning.reviewEvidence(evidenceId, {
          verdict: verdict,
          competency_id: pattern.competency_id,
          note: verdict === "edited" ? (note || editNote || undefined) : undefined,
        });
      }
      setDone(verdict);
      setEditing(false);
      if (onAction) onAction(verdict);
    } catch (e) {}
    setBusy(null);
  };

  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-800 hover:text-teal-950 underline underline-offset-2 decoration-teal-300 cursor-pointer bg-transparent border-0 p-0">
        <HelpCircle size={14} />
        {open ? "Hide evidence" : "Why? View evidence"}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5"
          role="region" aria-label="Evidence for this recommendation">
          {pattern.observed && (
            <p className="text-xs font-bold text-slate-700">{pattern.observed}</p>
          )}
          {items.length > 0 ? (
            <ul className="space-y-1">
              {items.map((it, i) => (
                <li key={i}
                  className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                  Q{it.question_no}: {it.question_text} {"->"} {it.student_answer}
                  <span className="text-slate-400"> (expected: {it.correct_answer})</span>
                </li>
              ))}
            </ul>
          ) : (pattern.evidence || []).length > 0 ? (
            <ul className="space-y-1">
              {(pattern.evidence || []).map((line, i) => (
                <li key={i}
                  className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">{line}</li>
              ))}
            </ul>
          ) : null}
          {pattern.pattern_description && (
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-extrabold text-slate-700">Pattern: </span>
              {pattern.pattern_description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">
              {supporting} of {total} responses support this
            </span>
            <span className={"text-[10px] " + strengthCls}>Evidence strength: {strength}</span>
          </div>
          <div className="text-xs leading-relaxed">
            {needsVerify ? (
              <p className="font-bold text-amber-800">
                {pattern.verification_note || "Insufficient evidence. Recommended: verify with 2 quick questions."}
              </p>
            ) : (
              <p className="font-semibold text-slate-500">
                {pattern.verification_note || "Sufficient evidence. Confirmation optional."}
              </p>
            )}
            {pattern.verify_question && (
              <p className="mt-1 text-slate-600">
                <span className="font-extrabold">Quick check: </span>{pattern.verify_question}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="button" disabled={!!busy} onClick={() => send("confirmed")}
              className="btn btn-secondary btn-sm inline-flex items-center gap-1">
              <Check size={13} /> {done === "confirmed" ? "Confirmed" : "Confirm"}
            </button>
            <button type="button" disabled={!!busy} onClick={() => setEditing((v) => !v)}
              className="btn btn-ghost btn-sm inline-flex items-center gap-1">
              <Pencil size={13} /> Edit
            </button>
            <button type="button" disabled={!!busy} onClick={() => send("verify")}
              className="btn btn-ghost btn-sm inline-flex items-center gap-1">
              <SearchCheck size={13} /> {done === "verify" ? "Marked for check" : "Verify"}
            </button>
          </div>
          {editing && (
            <div className="flex gap-2">
              <input className="input input-sm flex-1"
                placeholder="What did you actually see?"
                value={editNote} onChange={(e) => setEditNote(e.target.value)} />
              <button type="button" disabled={!!busy || !editNote.trim()}
                onClick={() => send("edited", editNote.trim())}
                className="btn btn-primary btn-sm">Save</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EvidenceWhy;

