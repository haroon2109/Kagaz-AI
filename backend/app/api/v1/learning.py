"""
Kagaz AI — Learning loop API.

Endpoints powering the ASSESS → UNDERSTAND → GROUP → ACT → REASSESS → REGROUP
loop. All pedagogical decisions are deterministic (framework-driven); the LLM
is only used upstream for OCR of messy handwriting.
"""

import asyncio
import csv
import io
import logging
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session

from app.api import deps
from app.models.learning import (
    Assessment,
    ClassRoom,
    Evidence,
    EvaluationNote,
    EvaluationRecord,
    GroupMember,
    Intervention,
    LearningGroup,
    ProgressEntry,
)
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.worksheet import Worksheet
from app.schemas.learning import (
    AssessmentCreate,
    AssessmentScanRequest,
    AssessmentResponse,
    ClassCreate,
    ClassDetailResponse,
    ClassResponse,
    EvaluationRecordCreate,
    EvaluationRecordUpdate,
    InterventionCompleteRequest,
    PatternFeedbackRequest,
    ReassessRequest,
    StudentBrief,
    TeacherReviewRequest,
)
from app.services import evidence as ev
from app.services import grouping as gr
from app.services import pipeline
from app.services.llm import llm_service
from app.services.framework import (
    ASSESSMENT_TEMPLATES,
    COMPETENCIES,
    INTERVENTION_LIBRARY,
    competency_label,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _own_class(db: Session, class_id: str, teacher: Teacher) -> ClassRoom:
    cr = db.query(ClassRoom).filter(ClassRoom.id == class_id, ClassRoom.teacher_id == teacher.id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Class not found")
    return cr


def _class_response(cr: ClassRoom, detail: bool = False) -> Dict[str, Any]:
    data = {
        "id": cr.id,
        "name": cr.name,
        "grade": cr.grade,
        "subject": cr.subject,
        "language": cr.language,
        "classroom_type": cr.classroom_type,
        "is_demo": cr.is_demo,
        "created_at": cr.created_at,
        "student_count": len(cr.students or []),
    }
    if detail:
        data["students"] = [
            {"id": s.id, "name": s.name, "roll_no": s.roll_no} for s in (cr.students or [])
        ]
    return data


# ─────────────────────────────────────────────────────────────────────────────
# Classes
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/classes")
def list_classes(db: Session = Depends(deps.get_db), current_user: Teacher = Depends(deps.get_current_user)):
    classes = db.query(ClassRoom).filter(ClassRoom.teacher_id == current_user.id).all()
    return [_class_response(cr) for cr in classes]


@router.post("/classes")
def create_class(
    payload: ClassCreate,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    cr = ClassRoom(
        teacher_id=current_user.id,
        name=payload.name.strip() or "My Class",
        grade=payload.grade,
        subject=payload.subject,
        language=payload.language,
        classroom_type=payload.classroom_type,
    )
    db.add(cr)
    db.flush()
    for idx, name in enumerate(payload.student_names or []):
        name = (name or "").strip()
        if not name:
            continue
        grade_level = None
        if payload.student_grades and idx < len(payload.student_grades):
            grade_level = (payload.student_grades[idx] or "").strip() or payload.grade
        db.add(Student(
            id=str(uuid.uuid4()),
            name=name,
            teacher_id=current_user.id,
            class_id=cr.id,
            grade_level=grade_level,
        ))
    db.commit()
    db.refresh(cr)
    return _class_response(cr, detail=True)


@router.get("/classes/{class_id}")
def get_class(
    class_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    cr = _own_class(db, class_id, current_user)
    resp = _class_response(cr, detail=True)
    resp["map"] = pipeline.class_map(db, cr)
    return resp


@router.get("/classes/{class_id}/map")
def get_class_map(
    class_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    cr = _own_class(db, class_id, current_user)
    return pipeline.class_map(db, cr)


# ─────────────────────────────────────────────────────────────────────────────
# Assessments
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/assessments/templates")
def list_templates():
    """Quick assessment templates (short, printable, low-ink)."""
    return list(ASSESSMENT_TEMPLATES.values())


@router.post("/assessments", response_model=AssessmentResponse)
def create_assessment(
    payload: AssessmentCreate,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    cr = _own_class(db, payload.class_id, current_user)
    template = ASSESSMENT_TEMPLATES.get(payload.template_key or "")
    subject = payload.subject or (template["subject"] if template else cr.subject)
    title = payload.title or (template["title"] if template else f"Quick Check — {cr.name}")
    a = Assessment(
        class_id=cr.id,
        teacher_id=current_user.id,
        subject=subject,
        title=title,
        template_key=payload.template_key,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.get("/assessments/{assessment_id}")
def get_assessment(
    assessment_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    a = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.teacher_id == current_user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    worksheets = db.query(Worksheet).filter(Worksheet.assessment_id == a.id).all()
    return {
        "id": a.id,
        "class_id": a.class_id,
        "subject": a.subject,
        "title": a.title,
        "template_key": a.template_key,
        "is_reassessment": a.is_reassessment,
        "intervention_id": a.intervention_id,
        "group_id": a.group_id,
        "target_competency": a.target_competency,
        "quick_check_questions": a.questions,
        "created_at": a.created_at,
        "scans": [
            {
                "id": w.id,
                "student_id": w.student_id,
                "student_name": w.student.name if w.student else None,
                "status": w.status,
                "final_score": w.final_score,
            }
            for w in worksheets
        ],
    }


@router.post("/assessments/{assessment_id}/scan")
async def attach_scan(
    assessment_id: str,
    payload: AssessmentScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    Attach a scanned image to an assessment as a worksheet and run the OCR
    pipeline (reusing the existing OCR service unchanged).
    """
    a = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.teacher_id == current_user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")

    student_id = payload.student_id
    if not student_id and payload.student_name:
        name = payload.student_name.strip()
        student = db.query(Student).filter(
            Student.name == name, Student.teacher_id == current_user.id
        ).first()
        if not student:
            student = Student(id=str(uuid.uuid4()), name=name, teacher_id=current_user.id, class_id=a.class_id)
            db.add(student)
            db.flush()
        student_id = student.id

    w = Worksheet(
        id=str(uuid.uuid4()),
        title=payload.title or f"{a.title} — scan",
        image_url=payload.image_url,
        status="processing",
        teacher_id=current_user.id,
        student_id=student_id,
        class_id=a.class_id,
        assessment_id=a.id,
        # Reassessment scans must NOT trigger the auto group-rebuild in the
        # pipeline: groups only move when the teacher confirms regrouping in
        # reassess_complete (otherwise the reassessed group could vanish
        # mid-flow). Evidence is still persisted for each scan.
        kind="reassessment" if a.is_reassessment else "assessment",
    )
    db.add(w)
    db.commit()
    db.refresh(w)

    from app.core.config import settings
    from app.tasks.grading import run_ocr_and_stage

    if settings.USE_CELERY:
        from app.tasks.celery_tasks import ocr_worksheet_task

        ocr_worksheet_task.delay(w.id)
    else:
        background_tasks.add_task(run_ocr_and_stage, w.id)

    return {
        "worksheet_id": w.id,
        "status": "processing",
        "is_reassessment": bool(a.is_reassessment),
        "group_id": a.group_id,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Analysis ("Understand")
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/worksheets/{worksheet_id}/analyze")
def analyze_worksheet_endpoint(
    worksheet_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    Deterministic competency mapping + error-pattern analysis for one scanned
    worksheet. Called after OCR completes (or after teacher corrections).
    """
    w = db.query(Worksheet).filter(Worksheet.id == worksheet_id, Worksheet.teacher_id == current_user.id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worksheet not found")
    if w.status == "processing":
        raise HTTPException(status_code=409, detail="OCR still running — try again shortly")

    analysis = pipeline.analyze_worksheet(db, w)
    db.commit()
    if not analysis:
        return {"analyzed": False, "reason": "No mappable responses found"}
    return {"analyzed": True, "analysis": analysis}


@router.get("/students/{student_id}/profile")
def student_profile(
    student_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    Student Learning Profile: demonstrated / developing / needs-support
    competencies, recent evidence, recommended next action, timeline.
    Not a marks report — the purpose is instructional action.
    """
    s = db.query(Student).filter(Student.id == student_id, Student.teacher_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")

    rows = db.query(Evidence).filter(Evidence.student_id == s.id).order_by(Evidence.created_at.desc()).all()
    latest: Dict[str, Evidence] = {}
    for r in rows:
        if r.competency_id not in latest:
            latest[r.competency_id] = r

    competencies = {}
    for cid, r in latest.items():
        obs = r.observation or {}
        why = obs.get("why") or {}
        competencies[cid] = {
            "competency_id": cid,
            "evidence_id": r.id,
            "status": r.status,
            "confidence": r.confidence,
            "teacher_review": r.teacher_review,
            "note": r.teacher_note,
            # ── Why? / View Evidence payload (explainable teacher support) ──
            # Every important recommendation carries which questions were
            # analyzed, what the student answered, expected answers, the
            # recurring pattern, support counts, confidence, and whether
            # teacher verification is recommended.
            "possible_gap": why.get("possible_gap"),
            "pattern_type": why.get("type"),
            "pattern_description": why.get("pattern_description"),
            "observed": why.get("observed"),
            "items": why.get("items", []),
            "supporting_count": why.get("supporting_count"),
            "total_questions": why.get("total_questions"),
            "evidence": why.get("evidence", []) or (obs.get("evidence", []) or []),
            "evidence_strength": why.get("evidence_strength"),
            "needs_teacher_verification": why.get(
                "needs_teacher_verification", r.confidence == "needs_verification"
            ),
            "verification_note": why.get("verification_note"),
            "verify_question": why.get("verify_question"),
        }
    summary = {
        "demonstrated": [competency_label(c) for c, v in competencies.items() if v["status"] == "demonstrated"],
        "developing": [competency_label(c) for c, v in competencies.items() if v["status"] == "developing"],
        "needs_support": [competency_label(c) for c, v in competencies.items() if v["status"] == "needs_support"],
    }

    # Recent evidence trail (assessments + reassessments)
    worksheets = (
        db.query(Worksheet)
        .filter(Worksheet.student_id == s.id, Worksheet.status.in_(["ocr_complete", "completed"]))
        .order_by(Worksheet.created_at.desc())
        .limit(5)
        .all()
    )
    recent = [
        {
            "worksheet_id": w.id,
            "title": w.title,
            "date": w.created_at,
            "score": w.final_score,
            "status": w.status,
        }
        for w in worksheets
    ]

    # Recommended next action from the weakest area with sufficient evidence.
    # When everything demonstrated: recommend the next competency up (extension).
    needs = sorted(
        [cid for cid, v in competencies.items() if v["status"] in ("needs_support", "developing")],
        key=lambda cid: COMPETENCIES.get(cid, {}).get("tier", 9),
    )
    target = needs[0] if needs else None
    intervention = gr.build_intervention(target) if target else None
    if not intervention:
        from app.services.framework import COMPETENCIES as _COMPS

        next_up = sorted(
            (c for c in _COMPS.values() if c["subject"] == (db.query(ClassRoom).get(s.class_id).subject if s.class_id else "mathematics") and c["id"] not in competencies),
            key=lambda c: c.get("tier", 9),
        )
        if next_up:
            intervention = {
                "title": f"Ready to advance: {next_up[0]['label']}",
                "duration_minutes": "10",
                "goal": f"Introduce {next_up[0]['label'].lower()} — all current skills demonstrated.",
                "materials": ["Blackboard", "Notebooks"],
                "teacher_steps": [
                    f"Demonstrate one example of {next_up[0]['label'].lower()} with concrete materials.",
                    "Solve one example together.",
                    "Give 2 guided problems.",
                    "Give 1 independent problem.",
                ],
                "target_competency": next_up[0]["id"],
                "source": "extension",
            }

    # Timeline: skill movements over time (from ProgressEntry, not marks)
    progress_rows = (
        db.query(ProgressEntry)
        .filter(ProgressEntry.student_id == s.id)
        .order_by(ProgressEntry.created_at.desc())
        .limit(20)
        .all()
    )
    timeline = [
        {
            "date": r.created_at,
            "competency": competency_label(r.competency_id),
            "status": r.status,
            "source": r.source,
        }
        for r in progress_rows
    ]

    return {
        "student": {"id": s.id, "name": s.name, "roll_no": s.roll_no, "class_id": s.class_id},
        "subject": (db.query(ClassRoom).get(s.class_id).subject if s.class_id else "mathematics"),
        "summary": summary,
        "competencies": {
            competency_label(cid): v for cid, v in competencies.items()
        },
        "recent_evidence": recent,
        "recommended_action": intervention,
        "timeline": timeline,
    }


@router.post("/evidence/{evidence_id}/review")
def review_evidence(
    evidence_id: str,
    payload: TeacherReviewRequest,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    Teacher-in-the-loop: confirm / edit / request more evidence for an AI
    inference. Stored as structured feedback, so the system never becomes an
    unquestionable black box. Also mirrors the verdict into the pattern
    feedback log so Confirm/Edit/Verify from the Why? view is counted.
    """
    row = db.query(Evidence).get(evidence_id)
    if not row:
        raise HTTPException(status_code=404, detail="Evidence not found")
    s = db.query(Student).get(row.student_id)
    if not s or s.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your student")

    if payload.verdict in ("edited", "edit") and payload.note:
        row.teacher_note = payload.note
    row.teacher_review = payload.verdict
    # Mirror into the evaluation log: Confirm/Edit = teacher agrees (or
    # corrected-and-agrees), Verify = teacher says "not enough evidence".
    try:
        obs = row.observation or {}
        why = obs.get("why") or {}
        db.add(EvaluationNote(
            worksheet_id=None,
            student_id=row.student_id,
            kind="pattern",
            ai_prediction=why.get("possible_gap") or why.get("pattern_description") or row.competency_id or "",
            teacher_label="incorrect" if payload.verdict == "verify" else "correct",
            reason=payload.note if payload.verdict in ("edited", "edit")
            else ("Teacher requested more evidence" if payload.verdict == "verify" else None),
        ))
    except Exception:
        pass
    db.commit()
    return {"status": "ok", "evidence_id": row.id, "teacher_review": row.teacher_review}


@router.post("/patterns/feedback")
def pattern_feedback(
    payload: PatternFeedbackRequest,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    Evaluation mode: record AI prediction vs teacher ground-truth label so the
    team can measure whether Kagaz actually works. Exportable via /evaluation.
    """
    note = EvaluationNote(
        worksheet_id=payload.worksheet_id,
        student_id=payload.student_id,
        kind="pattern",
        ai_prediction=payload.ai_prediction,
        teacher_label=payload.teacher_label,
        reason=payload.reason,
    )
    db.add(note)
    db.commit()
    return {"status": "logged"}


@router.get("/evaluation")
def evaluation_export(
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """Export evaluation notes (AI prediction vs teacher label) for the team."""
    notes = db.query(EvaluationNote).all()
    total = len(notes)
    agreed = sum(1 for n in notes if (n.teacher_label or "").lower() == "correct")
    return {
        "total": total,
        "agreement_count": agreed,
        "agreement_rate": round(agreed / total, 3) if total else None,
        "notes": [
            {
                "id": n.id,
                "worksheet_id": n.worksheet_id,
                "student_id": n.student_id,
                "kind": n.kind,
                "ai_prediction": n.ai_prediction,
                "teacher_label": n.teacher_label,
                "reason": n.reason,
                "created_at": n.created_at,
            }
            for n in notes
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Internal evaluation records (prototype metrics)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/evaluation/records")
def create_evaluation_record(
    payload: EvaluationRecordCreate,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """Create an evaluation record for one AI-analyzed question/student."""
    rec = EvaluationRecord(
        assessment_id=payload.assessment_id,
        worksheet_id=payload.worksheet_id,
        student_id=payload.student_id,
        student_name=payload.student_name,
        subject=payload.subject,
        ai_extracted_answer=payload.ai_extracted_answer,
        teacher_corrected_answer=payload.teacher_corrected_answer,
        ocr_was_correct=payload.ocr_was_correct,
        ai_competency=payload.ai_competency,
        ground_truth_competency=payload.ground_truth_competency,
        competency_match=payload.competency_match,
        ai_learning_gap=payload.ai_learning_gap,
        teacher_confirmed_gap=payload.teacher_confirmed_gap,
        gap_agrees=payload.gap_agrees,
        confidence=payload.confidence,
        recommendation=payload.recommendation,
        teacher_accepted_recommendation=payload.teacher_accepted_recommendation,
        processing_time_ms=payload.processing_time_ms,
        evaluated_by=current_user.id,
        notes=payload.notes,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"status": "created", "id": rec.id}


@router.get("/evaluation/records")
def list_evaluation_records(
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """List all evaluation records."""
    records = (
        db.query(EvaluationRecord)
        .order_by(EvaluationRecord.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "assessment_id": r.assessment_id,
            "worksheet_id": r.worksheet_id,
            "student_id": r.student_id,
            "student_name": r.student_name,
            "subject": r.subject,
            "ai_extracted_answer": r.ai_extracted_answer,
            "teacher_corrected_answer": r.teacher_corrected_answer,
            "ocr_was_correct": r.ocr_was_correct,
            "ai_competency": r.ai_competency,
            "ground_truth_competency": r.ground_truth_competency,
            "competency_match": r.competency_match,
            "ai_learning_gap": r.ai_learning_gap,
            "teacher_confirmed_gap": r.teacher_confirmed_gap,
            "gap_agrees": r.gap_agrees,
            "confidence": r.confidence,
            "recommendation": r.recommendation,
            "teacher_accepted_recommendation": r.teacher_accepted_recommendation,
            "processing_time_ms": r.processing_time_ms,
            "notes": r.notes,
            "evaluated_by": r.evaluated_by,
            "created_at": r.created_at,
            "evaluated_at": r.evaluated_at,
        }
        for r in records
    ]


@router.get("/evaluation/records/{record_id}")
def get_evaluation_record(
    record_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """Get a single evaluation record."""
    rec = db.query(EvaluationRecord).filter(EvaluationRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Evaluation record not found")
    return {
        "id": rec.id,
        "assessment_id": rec.assessment_id,
        "worksheet_id": rec.worksheet_id,
        "student_id": rec.student_id,
        "student_name": rec.student_name,
        "subject": rec.subject,
        "ai_extracted_answer": rec.ai_extracted_answer,
        "teacher_corrected_answer": rec.teacher_corrected_answer,
        "ocr_was_correct": rec.ocr_was_correct,
        "ai_competency": rec.ai_competency,
        "ground_truth_competency": rec.ground_truth_competency,
        "competency_match": rec.competency_match,
        "ai_learning_gap": rec.ai_learning_gap,
        "teacher_confirmed_gap": rec.teacher_confirmed_gap,
        "gap_agrees": rec.gap_agrees,
        "confidence": rec.confidence,
        "recommendation": rec.recommendation,
        "teacher_accepted_recommendation": rec.teacher_accepted_recommendation,
        "processing_time_ms": rec.processing_time_ms,
        "notes": rec.notes,
        "evaluated_by": rec.evaluated_by,
        "created_at": rec.created_at,
        "evaluated_at": rec.evaluated_at,
    }


@router.put("/evaluation/records/{record_id}")
def update_evaluation_record(
    record_id: str,
    payload: EvaluationRecordUpdate,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """Update an evaluation record (fill in teacher ground truth)."""
    rec = db.query(EvaluationRecord).filter(EvaluationRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Evaluation record not found")

    for field in (
        "teacher_corrected_answer", "ocr_was_correct",
        "ground_truth_competency", "competency_match",
        "teacher_confirmed_gap", "gap_agrees",
        "teacher_accepted_recommendation", "notes",
    ):
        val = getattr(payload, field)
        if val is not None:
            setattr(rec, field, val)

    import datetime as _dt
    rec.evaluated_at = _dt.datetime.utcnow()
    db.commit()
    return {"status": "updated", "id": rec.id}


@router.delete("/evaluation/records/{record_id}")
def delete_evaluation_record(
    record_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """Delete an evaluation record."""
    rec = db.query(EvaluationRecord).filter(EvaluationRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Evaluation record not found")
    db.delete(rec)
    db.commit()
    return {"status": "deleted", "id": record_id}


@router.get("/evaluation/metrics")
def evaluation_metrics(
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    Compute prototype evaluation metrics from all evaluation records.
    Returns 'Not enough evaluation data' when insufficient data exists.
    """
    records = db.query(EvaluationRecord).all()
    total = len(records)

    if total == 0:
        return {
            "total_records": 0,
            "message": "Not enough evaluation data.",
            "metrics": None,
        }

    # ── OCR accuracy ────────────────────────────────────────────────────────
    ocr_evaluated = [r for r in records if r.ocr_was_correct is not None]
    ocr_correct = sum(1 for r in ocr_evaluated if r.ocr_was_correct)
    ocr_accuracy = round(ocr_correct / len(ocr_evaluated), 3) if ocr_evaluated else None

    # ── Competency classification accuracy ──────────────────────────────────
    comp_evaluated = [r for r in records if r.competency_match is not None]
    comp_correct = sum(1 for r in comp_evaluated if r.competency_match)
    comp_accuracy = round(comp_correct / len(comp_evaluated), 3) if comp_evaluated else None

    # ── Learning-gap agreement ──────────────────────────────────────────────
    gap_evaluated = [r for r in records if r.gap_agrees is not None]
    gap_agreed = sum(1 for r in gap_evaluated if r.gap_agrees)
    gap_agreement = round(gap_agreed / len(gap_evaluated), 3) if gap_evaluated else None

    # ── Recommendation acceptance rate ──────────────────────────────────────
    rec_evaluated = [r for r in records if r.teacher_accepted_recommendation is not None]
    rec_accepted = sum(1 for r in rec_evaluated if r.teacher_accepted_recommendation)
    rec_acceptance = round(rec_accepted / len(rec_evaluated), 3) if rec_evaluated else None

    # ── Average teacher correction rate ─────────────────────────────────────
    # How often did the teacher need to correct the AI's extracted answer?
    ocr_total = len(ocr_evaluated)
    corrections_needed = sum(1 for r in ocr_evaluated if not r.ocr_was_correct)
    correction_rate = round(corrections_needed / ocr_total, 3) if ocr_total else None

    # ── Average processing time ─────────────────────────────────────────────
    timed = [r for r in records if r.processing_time_ms is not None]
    avg_processing_ms = round(
        sum(r.processing_time_ms for r in timed) / len(timed), 1
    ) if timed else None

    return {
        "total_records": total,
        "message": None,
        "metrics": {
            "ocr_accuracy": ocr_accuracy,
            "ocr_evaluated_count": len(ocr_evaluated),
            "competency_accuracy": comp_accuracy,
            "competency_evaluated_count": len(comp_evaluated),
            "gap_agreement": gap_agreement,
            "gap_evaluated_count": len(gap_evaluated),
            "recommendation_acceptance": rec_acceptance,
            "recommendation_evaluated_count": len(rec_evaluated),
            "correction_rate": correction_rate,
            "ocr_total_count": ocr_total,
            "avg_processing_time_ms": avg_processing_ms,
            "timed_count": len(timed),
        },
    }


@router.get("/evaluation/export")
def evaluation_export_csv(
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    Export all evaluation records as JSON array (ready for spreadsheet import).
    Also includes the computed metrics summary.
    """
    records = db.query(EvaluationRecord).order_by(EvaluationRecord.created_at.asc()).all()

    # Build metrics inline
    total = len(records)
    ocr_evaluated = [r for r in records if r.ocr_was_correct is not None]
    comp_evaluated = [r for r in records if r.competency_match is not None]
    gap_evaluated = [r for r in records if r.gap_agrees is not None]
    rec_evaluated = [r for r in records if r.teacher_accepted_recommendation is not None]

    return {
        "summary": {
            "total_records": total,
            "ocr_accuracy": round(sum(1 for r in ocr_evaluated if r.ocr_was_correct) / len(ocr_evaluated), 3) if ocr_evaluated else None,
            "competency_accuracy": round(sum(1 for r in comp_evaluated if r.competency_match) / len(comp_evaluated), 3) if comp_evaluated else None,
            "gap_agreement": round(sum(1 for r in gap_evaluated if r.gap_agrees) / len(gap_evaluated), 3) if gap_evaluated else None,
            "recommendation_acceptance": round(sum(1 for r in rec_evaluated if r.teacher_accepted_recommendation) / len(rec_evaluated), 3) if rec_evaluated else None,
        },
        "records": [
            {
                "id": r.id,
                "student_name": r.student_name,
                "ai_extracted_answer": r.ai_extracted_answer,
                "teacher_corrected_answer": r.teacher_corrected_answer,
                "ocr_was_correct": r.ocr_was_correct,
                "ai_competency": r.ai_competency,
                "ground_truth_competency": r.ground_truth_competency,
                "competency_match": r.competency_match,
                "ai_learning_gap": r.ai_learning_gap,
                "teacher_confirmed_gap": r.teacher_confirmed_gap,
                "gap_agrees": r.gap_agrees,
                "confidence": r.confidence,
                "recommendation": r.recommendation,
                "teacher_accepted_recommendation": r.teacher_accepted_recommendation,
                "processing_time_ms": r.processing_time_ms,
                "notes": r.notes,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "evaluated_at": r.evaluated_at.isoformat() if r.evaluated_at else None,
            }
            for r in records
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# CSV bulk import
# ─────────────────────────────────────────────────────────────────────────────

# Accepted CSV column headers → model field mapping
_CSV_FIELD_MAP = {
    "student_name": "student_name",
    "ai_extracted_answer": "ai_extracted_answer",
    "teacher_corrected_answer": "teacher_corrected_answer",
    "ocr_was_correct": "ocr_was_correct",
    "ai_competency": "ai_competency",
    "ground_truth_competency": "ground_truth_competency",
    "competency_match": "competency_match",
    "ai_learning_gap": "ai_learning_gap",
    "teacher_confirmed_gap": "teacher_confirmed_gap",
    "gap_agrees": "gap_agrees",
    "confidence": "confidence",
    "recommendation": "recommendation",
    "teacher_accepted_recommendation": "teacher_accepted_recommendation",
    "processing_time_ms": "processing_time_ms",
    "notes": "notes",
}

# Fields that should be parsed as booleans from CSV text
_BOOL_FIELDS = {
    "ocr_was_correct",
    "competency_match",
    "gap_agrees",
    "teacher_accepted_recommendation",
}

# Fields that should be parsed as floats from CSV text
_FLOAT_FIELDS = {"processing_time_ms"}


def _parse_bool(val: str):
    """Parse a CSV cell to bool/None. Returns None for empty/blank."""
    if val is None or val.strip() == "":
        return None
    v = val.strip().lower()
    if v in ("true", "yes", "1", "correct", "match", "agrees", "accepted"):
        return True
    if v in ("false", "no", "0", "incorrect", "wrong", "mismatch", "disagrees", "rejected"):
        return False
    return None


def _parse_float(val: str):
    """Parse a CSV cell to float/None."""
    if val is None or val.strip() == "":
        return None
    try:
        return float(val.strip())
    except ValueError:
        return None


@router.post("/evaluation/import")
def import_evaluation_csv(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    Bulk-import evaluation records from a CSV file.

    Accepted column headers (case-insensitive, flexible):
      student_name, ai_extracted_answer, teacher_corrected_answer,
      ocr_was_correct, ai_competency, ground_truth_competency,
      competency_match, ai_learning_gap, teacher_confirmed_gap,
      gap_agrees, confidence, recommendation,
      teacher_accepted_recommendation, processing_time_ms, notes

    Only headers matching the map above are used; extra columns are ignored.
    Rows with no student_name are skipped.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    try:
        raw = file.file.read()
        # Try UTF-8 first, fall back to latin-1
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            text = raw.decode("latin-1")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file has no header row")

    # Build column mapping: normalize headers to lowercase/underscore
    col_map: Dict[str, str] = {}  # csv_header → model_field
    for header in reader.fieldnames:
        normalized = header.strip().lower().replace(" ", "_").replace("-", "_")
        if normalized in _CSV_FIELD_MAP:
            col_map[header] = _CSV_FIELD_MAP[normalized]

    if not col_map:
        raise HTTPException(
            status_code=400,
            detail=f"No recognized columns found. Headers: {reader.fieldnames}. "
                   f"Accepted: {list(_CSV_FIELD_MAP.keys())}",
        )

    imported = 0
    skipped = 0
    errors: List[str] = []

    for row_num, row in enumerate(reader, start=2):  # row 1 = header
        student_name = (row.get("student_name") or "").strip()
        if not student_name:
            skipped += 1
            continue

        # Build record kwargs from mapped columns
        kwargs: Dict[str, Any] = {}
        for csv_header, model_field in col_map.items():
            raw_val = row.get(csv_header)
            if raw_val is None:
                continue
            raw_val = raw_val.strip()
            if raw_val == "":
                continue

            if model_field in _BOOL_FIELDS:
                kwargs[model_field] = _parse_bool(raw_val)
            elif model_field in _FLOAT_FIELDS:
                kwargs[model_field] = _parse_float(raw_val)
            else:
                kwargs[model_field] = raw_val

        # Must have at least student_name and one AI field
        has_ai_field = any(
            kwargs.get(f) is not None
            for f in ("ai_extracted_answer", "ai_competency", "ai_learning_gap", "recommendation")
        )
        if not has_ai_field:
            skipped += 1
            errors.append(f"Row {row_num}: no AI prediction fields — skipped")
            continue

        try:
            rec = EvaluationRecord(
                student_name=student_name,
                evaluated_by=current_user.id,
                **kwargs,
            )
            db.add(rec)
            imported += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {e}")
            skipped += 1

    if imported > 0:
        db.commit()

    return {
        "status": "ok",
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20],  # cap error list
        "total_rows": imported + skipped,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Groups & interventions
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/classes/{class_id}/groups")
def get_groups(
    class_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    cr = _own_class(db, class_id, current_user)
    groups = db.query(LearningGroup).filter(LearningGroup.class_id == class_id).order_by(LearningGroup.tier).all()
    out = []
    for g in groups:
        members = db.query(GroupMember).filter(GroupMember.group_id == g.id).all()
        students = {
            s.id: s
            for s in db.query(Student).filter(Student.id.in_([m.student_id for m in members])).all()
        } if members else {}
        out.append({
            "id": g.id,
            "name": g.name,
            "tier": g.tier,
            "focus_competency": g.focus_competency,
            "focus_label": g.focus_label,
            "recommended_activity": g.recommended_activity,
            "members": [
                {
                    "member_id": m.id,
                    "student_id": m.student_id,
                    "name": students[m.student_id].name if m.student_id in students else "?",
                    "status": m.status,
                    # visible in multi-grade classes: each child's grade inside
                    # the group (groups are competency-based, not grade-based)
                    "grade_level": (
                        students[m.student_id].grade_level
                        if m.student_id in students else None
                    ),
                    "roll_no": (
                        students[m.student_id].roll_no
                        if m.student_id in students else None
                    ),
                }
                for m in members
            ],
        })
    return out


@router.post("/classes/{class_id}/groups/rebuild")
def rebuild_groups_endpoint(
    class_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    cr = _own_class(db, class_id, current_user)
    groups = pipeline.rebuild_groups(db, cr)
    db.commit()
    return {"status": "rebuilt", "group_count": len(groups)}


@router.get("/interventions/{competency_id}")
def get_intervention(
    competency_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """10-minute remediation activity for a competency (library-based)."""
    act = gr.build_intervention(competency_id)
    if not act:
        raise HTTPException(status_code=404, detail="No activity available for this competency")
    return act


@router.post("/interventions/{intervention_id}/complete")
def complete_intervention(
    intervention_id: str,
    payload: InterventionCompleteRequest,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    iv = db.query(Intervention).get(intervention_id)
    if not iv:
        raise HTTPException(status_code=404, detail="Intervention not found")
    iv.completed = payload.completed
    db.commit()
    return {"status": "ok"}


# ─────────────────────────────────────────────────────────────────────────────
# Reassessment + regrouping
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/groups/{group_id}/reassess")
def reassess_group(
    group_id: str,
    payload: ReassessRequest,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    ACT → REASSESS: generate 2–5 quick questions targeted at the group's
    learning gap. Teacher prints/shows them, scans answers, then calls
    /reassess/complete to regroup.
    """
    g = db.query(LearningGroup).get(group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    cr = db.query(ClassRoom).get(g.class_id)
    if not cr or cr.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your class")

    members = db.query(GroupMember).filter(GroupMember.group_id == g.id).all()
    if payload.student_ids:
        members = [m for m in members if m.student_id in set(payload.student_ids)]
    target = g.focus_competency

    # ACT → REASSESS: AI-generate a fresh quick-check targeted at the group's
    # learning gap (difficulty ramp, class grade + language of instruction).
    # Falls back to the static intervention library when no AI engine is
    # configured/reachable, so the loop never breaks offline.
    comp = COMPETENCIES.get(target or "", {})
    questions: List[Dict[str, Any]] = []
    question_source = "library"
    try:
        generated = asyncio.run(
            llm_service.generate_quick_check_questions(
                competency_id=target or "",
                competency_label=comp.get("label", target or ""),
                competency_description=comp.get("description", ""),
                grade=cr.grade,
                language=cr.language,
                verify_question=comp.get("verify_question", ""),
                count=4,
            )
        )
    except RuntimeError:
        # asyncio.run inside an already-running loop (shouldn't happen on sync
        # endpoints, but be safe) — fall back to the library below.
        generated = None
    if generated:
        questions = generated
        question_source = "ai_generated"

    if not questions:
        # Library fallback: guided/mastery questions for the competency
        act = gr.build_intervention(target) if target else None
        if act:
            for i, q in enumerate((act.get("guided_practice") or [])[:2], start=1):
                questions.append({"number": str(i), "text": str(q), "competencies": [target], "correct_answer": None})
            for j, q in enumerate((act.get("mastery_check") or [])[:1], start=len(questions) + 1):
                questions.append({"number": str(j), "text": str(q), "competencies": [target], "correct_answer": None})
    if not questions:
        questions = [{"number": "1", "text": comp.get("verify_question", "Solve one example aloud."), "competencies": [target] if target else [], "correct_answer": None}]

    a = Assessment(
        class_id=cr.id,
        teacher_id=current_user.id,
        subject=cr.subject,
        title=f"Quick check — {g.name}",
        is_reassessment=True,
        group_id=g.id,
        target_competency=target,
        questions=questions,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {
        "assessment_id": a.id,
        "group_id": g.id,
        "group_name": g.name,
        "target_competency": target,
        "question_source": question_source,  # "ai_generated" | "library"
        "questions": questions,
        "members": [m.student_id for m in members],
        "member_names": {m.student_id: (db.query(Student).get(m.student_id).name if db.query(Student).get(m.student_id) else "Student") for m in members},
    }


@router.post("/assessments/{assessment_id}/reassess/complete")
def reassess_complete(
    assessment_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    REASSESS → REGROUP: compare before/after evidence for the group and move
    students who demonstrated the target skill.
    """
    a = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.teacher_id == current_user.id).first()
    if not a or not a.is_reassessment:
        raise HTTPException(status_code=404, detail="Reassessment not found")

    target = a.target_competency
    if not target:
        raise HTTPException(status_code=400, detail="Reassessment has no target competency")

    # The group that was reassessed — recorded at creation time so regrouping
    # has a deterministic target even if groups were rebuilt in between.
    group = db.query(LearningGroup).get(a.group_id) if a.group_id else None
    if not group and a.group_id:
        # Fallback: the recorded group was rebuilt away (e.g. a parallel scan
        # of the same class). Reattach to the current group containing the
        # majority of the reassessed students so regrouping still works.
        scans_exist = db.query(Worksheet.id).filter(Worksheet.assessment_id == a.id).first()
        if scans_exist:
            sids = [s.student_id for s in db.query(Worksheet).filter(Worksheet.assessment_id == a.id).all() if s.student_id]
            best, best_count = None, 0
            for g2 in db.query(LearningGroup).filter(LearningGroup.class_id == a.class_id).all():
                overlap = sum(1 for m in g2.members if m.student_id in set(sids))
                if overlap > best_count:
                    best, best_count = g2, overlap
            group = best
    if not group:
        raise HTTPException(status_code=400, detail="Reassessment is not linked to a learning group")

    scans = db.query(Worksheet).filter(Worksheet.assessment_id == a.id).all()
    if not scans:
        raise HTTPException(status_code=409, detail="No scanned answers for this quick check yet")

    before: Dict[str, str] = {}
    after_status: Dict[str, str] = {}
    for w in scans:
        if not w.student_id:
            continue
        analysis = pipeline.analyze_worksheet(db, w)
        if analysis:
            after_status[w.student_id] = analysis["competencies"].get(target, {}).get("status", "needs_support")

    # "Before" = latest prior evidence per student for the target competency
    for sid in after_status.keys():
        prior = (
            db.query(Evidence)
            .filter(
                Evidence.student_id == sid,
                Evidence.competency_id == target,
                Evidence.source_assessment_id != a.id,
            )
            .order_by(Evidence.created_at.desc())
            .first()
        )
        before[sid] = prior.status if prior else "needs_support"

    def _advanced(after: str, before: str) -> bool:
        """A student advances when the target skill moved up a level."""
        rank = {"needs_support": 0, "developing": 1, "demonstrated": 2}
        return rank.get(after, 0) > rank.get(before, 0)

    ready_ids = {sid for sid in after_status if _advanced(after_status[sid], before.get(sid, "needs_support"))}
    still_ids = {sid for sid in after_status if sid not in ready_ids}

    # ── REGROUP (actually move students) ───────────────────────────────────
    # Persist new evidence first so the rebuild reflects reassessment results.
    db.commit()
    # Snapshot group identity BEFORE rebuild_groups deletes/recreates the
    # row — touching the ORM object afterwards raises ObjectDeletedError.
    _group_id, _group_name = group.id, group.name
    members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    for m in members:
        if m.student_id in ready_ids:
            m.status = "ready_to_advance"
        elif m.student_id in still_ids:
            m.status = "continue_support"
        # members not scanned keep their previous status

    classroom = db.query(ClassRoom).get(group.class_id)
    groups_before = None
    if classroom:
        groups_before = [
            {"name": g.name, "tier": g.tier, "members": [mm.student_id for mm in g.members]}
            for g in db.query(LearningGroup).filter(LearningGroup.class_id == classroom.id).all()
        ]
        pipeline.rebuild_groups(db, classroom)

    db.commit()

    groups_after = []
    if classroom:
        groups_after = [
            {"name": g.name, "tier": g.tier, "member_count": len(g.members)}
            for g in db.query(LearningGroup).filter(LearningGroup.class_id == classroom.id).order_by(LearningGroup.tier).all()
        ]

    n_ready, n_still = len(ready_ids), len(still_ids)
    return {
        "assessment_id": a.id,
        "target_competency": target,
        "target_label": competency_label(target),
        "group_id": _group_id,
        "group_name": _group_name,
        "before_after": [
            {"student_id": sid, "before": before.get(sid), "after": after_status[sid], "advanced": sid in ready_ids}
            for sid in after_status
        ],
        "improved_count": n_ready,
        "still_needs_support": sorted(still_ids),
        "ready_to_advance": sorted(ready_ids),
        "groups_before": groups_before,
        "groups_after": groups_after,
        "message": (
            f"{n_ready} student(s) demonstrated the target skill and are ready to advance; "
            f"{n_still} will continue receiving support. Groups updated."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Today's Action
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/classes/{class_id}/today")
def today(
    class_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """Deterministic Today plan — instant, no AI in this path."""
    cr = _own_class(db, class_id, current_user)
    return pipeline.compute_today_action(db, cr)


@router.get("/classes/{class_id}/today/narrative")
def today_narrative(
    class_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    AI insight narration — LLM coaching note on top of the deterministic
    evidence. Separate endpoint so a slow local model can never delay the
    Today plan itself. Fails soft: {"ai_narrative": null} with 200 on any
    AI problem (timeout / no engine / bad output); 404 only when the class
    has no plan to narrate.
    """
    cr = _own_class(db, class_id, current_user)
    plan = pipeline.compute_today_action(db, cr)
    action = plan.get("action") or {}
    if not action:
        raise HTTPException(status_code=404, detail="No plan to narrate yet — assess some students first")

    try:
        import asyncio

        narrative = asyncio.run(
            llm_service.narrate_today_action(
                action=action,
                snapshot=plan.get("snapshot") or {},
                groups=plan.get("groups") or [],
                class_name=cr.name,
                language=cr.language,
                timeout=20,
            )
        )
    except Exception as narr_err:
        logger.warning(f"[Today] AI narration unavailable (plan unaffected): {narr_err}")
        narrative = None

    return {
        "class_id": class_id,
        "ai_narrative": narrative,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Class progress (before → after, no causal claims)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/classes/{class_id}/progress")
def class_progress(
    class_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    cr = _own_class(db, class_id, current_user)
    entries = (
        db.query(ProgressEntry, Student)
        .join(Student, Student.id == ProgressEntry.student_id)
        .filter(Student.class_id == class_id)
        .order_by(ProgressEntry.created_at.asc())
        .all()
    )
    by_ts: Dict[str, Dict[str, int]] = {}
    for entry, _ in entries:
        key = entry.created_at.strftime("%Y-%m-%d")
        bucket = by_ts.setdefault(key, {"demonstrated": 0, "developing": 0, "needs_support": 0})
        bucket[entry.status] = bucket.get(entry.status, 0) + 1
    timeline = [
        {"date": k, "demonstrated": v["demonstrated"], "developing": v["developing"], "needs_support": v["needs_support"]}
        for k, v in sorted(by_ts.items())
    ]
    current = timeline[-1] if timeline else None
    return {
        "class_id": cr.id,
        "timeline": timeline,
        "current": current,
        "note": "Counts of competency evidence records over time — this shows observed change, not proven causation.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Demo mode — "Try Demo Class"
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/demo/setup")
def demo_setup(
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """
    Create the fictional demo class + seed realistic evidence through the REAL
    evidence engine, so the full loop can be demoed even if the AI API is down.
    Idempotent.
    """
    from app.services import demo as demo_service

    cr = demo_service.ensure_demo_class(db, current_user)
    result = demo_service.populate_demo_evidence(db, cr, current_user)
    return {
        "status": "ok",
        "class": _class_response(cr, detail=False),
        **result,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Framework introspection (for UI rendering)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/framework")
def get_framework(subject: Optional[str] = None):
    comps = [
        c for c in COMPETENCIES.values()
        if subject is None or c["subject"] == subject
    ]
    return {"competencies": comps, "templates": list(ASSESSMENT_TEMPLATES.values())}
