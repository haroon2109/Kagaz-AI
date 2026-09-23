"""
Kagaz AI — Analysis pipeline glue.

Connects the OCR/grading pipeline to the learning loop:
  • analyze_worksheet   — evidence analysis for one scanned worksheet
  • class_map           — competency × status counts for the Class Learning Map
  • rebuild_groups      — (re)build learning groups from latest evidence
  • apply_regrouping    — move students after a reassessment
  • compute_today_action— read model for the "Today with Kagaz" screen

All logic is deterministic and framework-driven; no LLM in the decision path.
"""

import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.learning import (
    Assessment,
    ClassRoom,
    Evidence,
    GroupMember,
    Intervention,
    LearningGroup,
    ProgressEntry,
)
from app.models.student import Student
from app.models.worksheet import Worksheet, WorksheetItem
from app.services import evidence as ev
from app.services import grouping as gr
from app.services.framework import competency_label

logger = logging.getLogger(__name__)

# Serialize group rebuilds per class (see analyze_worksheet)
import threading

_group_rebuild_locks: Dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def class_id_key(cid: str) -> str:
    with _locks_guard:
        if cid not in _group_rebuild_locks:
            _group_rebuild_locks[cid] = threading.Lock()
        return cid


# ─────────────────────────────────────────────────────────────────────────────
# Worksheet → evidence
# ─────────────────────────────────────────────────────────────────────────────

def analyze_worksheet(db: Session, worksheet: Worksheet) -> Optional[Dict[str, Any]]:
    """
    Run the deterministic evidence engine over a worksheet's items and persist
    Evidence + ProgressEntry rows. Returns the analysis dict (or None when the
    worksheet has no mappable items).
    """
    items = [
        {
            "question_no": it.question_no,
            "question_text": it.question_text or "",
            "student_answer": it.student_answer or "",
            "correct_answer": it.correct_answer or "",
            "is_correct": it.is_correct,
        }
        for it in (worksheet.items or [])
    ]
    if not items:
        return None

    template_key = None
    if worksheet.assessment_id:
        assessment = db.query(Assessment).get(worksheet.assessment_id)
        template_key = assessment.template_key if assessment else None

    subject = "mathematics"
    if worksheet.assessment_id and assessment and assessment.subject:
        subject = assessment.subject

    analysis = ev.analyze_responses(items, subject=subject, template_key=template_key)
    if not analysis["competencies"]:
        return None

    if worksheet.student_id:
        # Avoid duplicate evidence rows if analysis is re-run (e.g. after OCR correction)
        db.query(Evidence).filter(
            Evidence.student_id == worksheet.student_id,
            Evidence.source_assessment_id == worksheet.assessment_id,
        ).delete(synchronize_session=False)
        ev.persist_evidence(
            db,
            worksheet.student_id,
            worksheet.class_id,
            analysis,
            subject,
            worksheet.assessment_id,
        )

        # Keep learning groups in sync with the latest evidence so the loop
        # (assess → understand → group) advances without a manual step.
        # Evidence is committed BEFORE the locked rebuild so a rebuild that
        # runs after concurrent scans always sees their committed evidence.
        #
        # Exception: reassessment scans persist evidence but do NOT rebuild —
        # regrouping is an explicit teacher action (reassess_complete), so the
        # reassessed group cannot be silently rebuilt away mid-flow.
        is_reassessment = (getattr(worksheet, "kind", None) == "reassessment")
        db.commit()
        if worksheet.class_id and not is_reassessment:
            with _group_rebuild_locks[class_id_key(worksheet.class_id)]:
                classroom = db.query(ClassRoom).get(worksheet.class_id)
                if classroom:
                    rebuild_groups(db, classroom)
                    db.commit()

    return analysis


def latest_evidence_by_student(db: Session, class_id: str) -> Dict[str, Dict[str, Any]]:
    """
    Build {student_id: analysis-like dict} from each student's most recent
    Evidence rows. This is the read model that powers groups, class map and
    Today's Action without recomputing from raw scans every time.
    """
    students = db.query(Student).filter(Student.class_id == class_id).all()
    result: Dict[str, Dict[str, Any]] = {}
    for s in students:
        rows = (
            db.query(Evidence)
            .filter(Evidence.student_id == s.id, Evidence.class_id == class_id)
            .all()
        )
        if not rows:
            continue
        # Latest evidence per competency (rows are timestamped; take max per cid)
        latest: Dict[str, Evidence] = {}
        for r in rows:
            if (
                r.competency_id not in latest
                or (r.created_at or _epoch()) > (latest[r.competency_id].created_at or _epoch())
            ):
                latest[r.competency_id] = r
        competencies = {
            cid: {
                "label": competency_label(cid),
                "status": r.status,
                "confidence": r.confidence,
                "attempted": (r.observation or {}).get("attempted", 0),
                "correct": (r.observation or {}).get("correct", 0),
            }
            for cid, r in latest.items()
        }
        result[s.id] = {
            "student_id": s.id,
            "name": s.name,
            "competencies": competencies,
            "summary": {
                "demonstrated": sorted(
                    [c for c, v in competencies.items() if v["status"] == "demonstrated"],
                    key=lambda c: _tier_of(c),
                ),
                "developing": sorted(
                    [c for c, v in competencies.items() if v["status"] == "developing"],
                    key=lambda c: _tier_of(c),
                ),
                "needs_support": sorted(
                    [c for c, v in competencies.items() if v["status"] == "needs_support"],
                    key=lambda c: _tier_of(c),
                ),
            },
            "tier_hint": ev.suggest_tier(competencies),
        }
    return result


def _epoch():
    import datetime

    return datetime.datetime.min


def _tier_of(cid: str) -> int:
    from app.services.framework import COMPETENCIES

    return COMPETENCIES.get(cid, {}).get("tier", 9)


# ─────────────────────────────────────────────────────────────────────────────
# Class learning map
# ─────────────────────────────────────────────────────────────────────────────

def class_map(db: Session, class_room: ClassRoom) -> Dict[str, Any]:
    """
    "Where is my class?" — competency × {demonstrated, developing, needs_support}
    counts, ordered by framework tier, understandable in under 10 seconds.
    """
    evidence_map = latest_evidence_by_student(db, class_room.id)
    students = db.query(Student).filter(Student.class_id == class_room.id).all()

    comp_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: {"demonstrated": 0, "developing": 0, "needs_support": 0})
    for se in evidence_map.values():
        for cid, c in se["competencies"].items():
            comp_counts[cid][c["status"]] += 1

    rows = [
        {
            "competency_id": cid,
            "label": competency_label(cid),
            "demonstrated": counts["demonstrated"],
            "developing": counts["developing"],
            "needs_support": counts["needs_support"],
        }
        for cid, counts in comp_counts.items()
    ]
    rows.sort(key=lambda r: _tier_of(r["competency_id"]))

    assessed = len(evidence_map)
    return {
        "class_id": class_room.id,
        "class_name": class_room.name,
        "grade": class_room.grade,
        "subject": class_room.subject,
        "students_total": len(students),
        "students_assessed": assessed,
        "not_yet_assessed": len(students) - assessed,
        "rows": rows,
        "headline": _headline(rows, assessed),
    }


def _headline(rows: List[Dict[str, Any]], assessed: int) -> Optional[str]:
    if assessed == 0 or not rows:
        return None
    worst = max(rows, key=lambda r: r["needs_support"])
    if worst["needs_support"] == 0:
        return None
    return f"{worst['needs_support']} student(s) need support in {worst['label'].lower()}."


# ─────────────────────────────────────────────────────────────────────────────
# Groups
# ─────────────────────────────────────────────────────────────────────────────

def rebuild_groups(db: Session, class_room: ClassRoom) -> List[LearningGroup]:
    """
    (Re)build learning groups from each student's latest evidence.
    Existing groups are replaced; students not yet assessed stay ungrouped.
    """
    # The app runs with autoflush=False — flush pending evidence writes so
    # this session's own queries see them.
    db.flush()
    evidence_map = latest_evidence_by_student(db, class_room.id)

    # Replace existing groups (and their member rows — no orphans)
    old_groups = db.query(LearningGroup).filter(LearningGroup.class_id == class_room.id).all()
    for g in old_groups:
        db.query(GroupMember).filter(GroupMember.group_id == g.id).delete(synchronize_session=False)
    db.query(LearningGroup).filter(LearningGroup.class_id == class_room.id).delete(synchronize_session=False)
    db.flush()

    students_evidence = list(evidence_map.values())
    group_dicts = gr.build_groups_from_evidence(students_evidence)

    saved: List[LearningGroup] = []
    for gd in group_dicts:
        g = LearningGroup(
            class_id=class_room.id,
            name=gd["name"],
            tier=gd["tier"],
            focus_competency=gd["focus_competency"],
            focus_label=gd["focus_label"],
            recommended_activity=gd["recommended_activity"],
            is_demo=class_room.is_demo,
        )
        db.add(g)
        db.flush()
        for m in gd["members"]:
            db.add(GroupMember(group_id=g.id, student_id=m["student_id"], status="active"))
        saved.append(g)
    db.flush()
    return saved


def apply_regrouping(
    db: Session,
    intervention: Intervention,
    reassessment_analysis: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    """
    After a reassessment: members who demonstrated the target skill are marked
    ready_to_advance; the rest continue support. Regenerates the class groups.
    """
    group = db.query(LearningGroup).get(intervention.group_id) if intervention.group_id else None
    if not group:
        return {}

    members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    student_ids = [m.student_id for m in members]
    students = {s.id: s for s in db.query(Student).filter(Student.id.in_(student_ids)).all()}

    prev = [{"student_id": m.student_id, "name": students[m.student_id].name if m.student_id in students else "?"} for m in members]
    outcome = gr.regroup_after_reassessment(prev, reassessment_analysis)

    for m in members:
        if any(r["student_id"] == m.student_id for r in outcome["ready_to_advance"]):
            m.status = "ready_to_advance"
        else:
            m.status = "continue_support"

    # Regenerate whole-class groups to reflect movement
    classroom = db.query(ClassRoom).get(group.class_id)
    if classroom:
        rebuild_groups(db, classroom)

    return outcome


# ─────────────────────────────────────────────────────────────────────────────
# Today's Action
# ─────────────────────────────────────────────────────────────────────────────

def compute_today_action(db: Session, class_room: ClassRoom) -> Dict[str, Any]:
    """
    "What should I do today?" — snapshot, warm-up, group actions, quick check.
    Built deterministically from the current groups + intervention library.
    An optional LLM narration layer (ai_narrative) is added on top when an AI
    engine is reachable; the deterministic plan is ALWAYS returned, narration
    is best-effort and never blocks or alters the plan itself.
    """
    groups = db.query(LearningGroup).filter(LearningGroup.class_id == class_room.id).all()
    cmap = class_map(db, class_room)

    group_dicts = []
    interventions: List[Dict[str, Any]] = []
    for g in sorted(groups, key=lambda x: x.tier or "0"):
        members = db.query(GroupMember).filter(
            GroupMember.group_id == g.id, GroupMember.status == "active"
        ).all()
        students = {s.id: s for s in db.query(Student).filter(Student.id.in_([m.student_id for m in members])).all()} if members else {}
        gd = {
            "id": g.id,
            "tier": g.tier,
            "name": g.name,
            "label": g.label if hasattr(g, "label") else TIERS_LABEL(g.tier),
            "focus_competency": g.focus_competency,
            "focus_label": g.focus_label,
            "recommended_activity": g.recommended_activity,
            "member_count": len(members),
        }
        group_dicts.append(gd)
        if g.focus_competency:
            act = gr.build_intervention(g.focus_competency)
            if act:
                act["id"] = f"lib:{g.focus_competency}"
                interventions.append(act)

    action = gr.today_action(group_dicts, interventions)

    snapshot = {
        "students_assessed": cmap["students_assessed"],
        "students_total": cmap["students_total"],
        "needs_support_counts": [
            {"label": r["label"], "count": r["needs_support"]}
            for r in cmap["rows"] if r["needs_support"] > 0
        ][:4],
        "ready_to_advance": sum(
            1 for g in group_dicts if int(g["tier"] or 0) >= 3 for _ in range(g["member_count"])
        ),
    }
    return {
        "class_id": class_room.id,
        "class_name": class_room.name,
        "snapshot": snapshot,
        "action": action,
        "groups": group_dicts,
        "class_map": cmap,
    }


def TIERS_LABEL(tier: str) -> str:
    from app.services.framework import TIERS

    return TIERS.get(tier, {}).get("label", f"Tier {tier}")
