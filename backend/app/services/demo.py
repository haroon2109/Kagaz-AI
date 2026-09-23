"""
Kagaz AI — Demo mode.

A controlled, fictional Grade 3 Mathematics demo class so the full loop
(scan → understand → group → act → reassess → regroup) can be demonstrated
even if the live AI API fails. Demo data contains NO real children's data.

The demo flow is wired through the real pipeline: the evidence engine analyzes
demo responses with the same deterministic rules used for real scans. Demo
data lives here, separate from the production flow (never faked inline).
"""

import uuid
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models.learning import ClassRoom, Assessment
from app.models.student import Student
from app.models.teacher import Teacher

DEMO_CLASS_NAME = "Demo Class 3B (Sample)"

# ── Fictional roster (aliases only — no real children) ───────────────────────
DEMO_STUDENTS: List[str] = [
    "Aarav", "Bhavna", "Chirag", "Diya", "Eshan", "Fatima", "Gopal", "Hina",
    "Ishaan", "Jaya", "Kabir", "Lata", "Mohan", "Nisha", "Omkar", "Priya",
    "Qadir", "Rani", "Sameer", "Tara", "Umesh", "Vidya", "Wahid", "Zoya",
    "Aditi", "Rohit", "Sneha", "Vikram", "Meena", "Arjun", "Kavya", "Deepak",
    "Anita", "Farhan", "Geeta", "Harsh",
]

# ── Simulated quick-check responses (Grade 2–3 template, 6 questions) ────────
# Q1 read numbers, Q2 compare, Q3 23+14=37, Q4 45-21=24 (no regroup),
# Q5 42-17=25, Q6 53-28=25 (both need regrouping).
# Each entry: correct answers for all, or specific wrong answers to plant
# realistic error patterns (regrouping errors dominate → Group B/C story).
def _demo_answers() -> Dict[str, Dict[str, str]]:
    """
    Build a per-student response map. Distribution aims for a realistic mix:
    ~1/3 strong, ~1/3 middle (regrouping gaps), ~1/3 foundational gaps.
    """
    students = {}
    strong = {"1": "17, 42, 85", "2": "74", "3": "37", "4": "24", "5": "25", "6": "25", "7": "85"}
    # regrouping pattern errors: subtract small-from-large in ones column
    # 42-17 → 2-7 → borrow → wrong: writes 35 (i.e. 4-1=3 tens, 7-2=5 ones flipped)
    regroup_wrong_5 = "35"
    regroup_wrong_6 = "35"
    middle = {"1": "17, 42, 85", "2": "74", "3": "37", "4": "24", "5": regroup_wrong_5, "6": regroup_wrong_6, "7": "75"}
    # foundational: cannot read 2-digit numbers, compare fails, operations wrong
    weak = {"1": "17", "2": "47", "3": "314", "4": "264", "5": "314", "6": "264", "7": "715"}
    # mixed: reads fine but place value slipping (off-by-ten)
    placevalue = {"1": "17, 42, 85", "2": "47", "3": "37", "4": "34", "5": "25", "6": "35", "7": "85"}

    archetypes = (
        [strong] * 12
        + [middle] * 11
        + [weak] * 7
        + [placevalue] * 6
    )
    for i, name in enumerate(DEMO_STUDENTS):
        students[name] = dict(archetypes[i % len(archetypes)])
    return students


DEMO_ANSWERS: Dict[str, Dict[str, str]] = _demo_answers()


def ensure_demo_class(db: Session, teacher: Teacher) -> ClassRoom:
    """Get or create the demo class (idempotent per teacher)."""
    cr = (
        db.query(ClassRoom)
        .filter(ClassRoom.teacher_id == teacher.id, ClassRoom.is_demo.is_(True))
        .first()
    )
    if cr:
        return cr

    cr = ClassRoom(
        teacher_id=teacher.id,
        name=DEMO_CLASS_NAME,
        grade="Grade 3",
        subject="mathematics",
        language="English",
        classroom_type="single_grade",
        is_demo=True,
    )
    db.add(cr)
    db.flush()

    for name in DEMO_STUDENTS:
        db.add(Student(
            id=str(uuid.uuid4()),
            name=name,
            roll_no=str(len(DEMO_STUDENTS) and (DEMO_STUDENTS.index(name) + 1)),
            teacher_id=teacher.id,
            class_id=cr.id,
        ))
    db.commit()
    db.refresh(cr)
    return cr


def demo_assessment_seed(db: Session, class_room: ClassRoom, teacher: Teacher) -> Assessment:
    """
    Create (or return) the demo assessment event. Actual evidence generation
    happens through analyze_demo_assessment below — same engine as real scans.
    """
    a = (
        db.query(Assessment)
        .filter(Assessment.class_id == class_room.id, Assessment.template_key == "math_g2_3_quick")
        .first()
    )
    if a:
        return a
    a = Assessment(
        class_id=class_room.id,
        teacher_id=teacher.id,
        subject="mathematics",
        title="Quick Math Check — Grade 2–3",
        template_key="math_g2_3_quick",
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def populate_demo_evidence(db: Session, class_room: ClassRoom, teacher: Teacher) -> Dict[str, Any]:
    """
    Run the REAL evidence engine over the demo answers (as if each student's
    paper had been scanned and OCR'd), then rebuild groups. This keeps the demo
    honest: no fake analysis, just pre-seeded responses.
    """
    from app.services import evidence as ev
    from app.services import pipeline
    from app.services.framework import template_questions

    assessment = demo_assessment_seed(db, class_room, teacher)
    students = {s.name: s for s in db.query(Student).filter(Student.class_id == class_room.id).all()}

    answers = DEMO_ANSWERS
    for name, student in students.items():
        ans = answers.get(name)
        if not ans:
            continue
        items = []
        for q in template_questions("math_g2_3_quick"):
            items.append({
                "question_no": q["number"],
                "question_text": q["text"],
                "student_answer": ans.get(q["number"], ""),
                "correct_answer": q["correct_answer"],
            })
        analysis = ev.analyze_responses(items, subject="mathematics", template_key="math_g2_3_quick")
        if analysis["competencies"]:
            # Replace prior demo evidence for idempotency
            from app.models.learning import Evidence, ProgressEntry

            db.query(Evidence).filter(
                Evidence.student_id == student.id,
                Evidence.source_assessment_id == assessment.id,
            ).delete(synchronize_session=False)
            db.query(ProgressEntry).filter(
                ProgressEntry.student_id == student.id,
                ProgressEntry.assessment_id == assessment.id,
            ).delete(synchronize_session=False)
            ev.persist_evidence(db, student.id, class_room.id, analysis, "mathematics", assessment.id)

    pipeline.rebuild_groups(db, class_room)
    db.commit()
    return {
        "class_id": class_room.id,
        "assessment_id": assessment.id,
        "students_seeded": len(students),
    }
