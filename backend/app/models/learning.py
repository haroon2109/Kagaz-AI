"""
Kagaz AI — Learning-domain models.

Extends the existing teacher/student/worksheet schema with the entities needed
for the ASSESS → UNDERSTAND → GROUP → ACT → REASSESS → REGROUP loop:

  ClassRoom        a teacher's class (grade/subject/language, multi-grade aware)
  Assessment       a quick foundational assessment event for a class
  Evidence         competency-level evidence for a student (NOT a marks report)
  LearningGroup    competency-based learning group for a class
  GroupMember      student membership in a learning group (+ reassessment result)
  Intervention     a short remediation activity tied to a group + competency
  ProgressEntry    student competency status over time (timeline)

Personally identifiable information is kept minimal: student records only carry
a name/alias and an optional roll number.
"""

import datetime
import uuid

from sqlalchemy import Column, String, Float, Boolean, ForeignKey, JSON, DateTime, Index
from sqlalchemy.orm import relationship

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


class ClassRoom(Base):
    __tablename__ = "class_rooms"

    id = Column(String, primary_key=True, index=True, default=_uuid)
    teacher_id = Column(String, ForeignKey("teachers.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    grade = Column(String, nullable=True)            # "Grade 3", "Nursery–5", …
    subject = Column(String, nullable=False, default="mathematics")  # mathematics | literacy
    language = Column(String, nullable=True)
    classroom_type = Column(String, default="single_grade")  # single_grade | multi_grade
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)

    teacher = relationship("Teacher")
    students = relationship("Student", back_populates="class_room")
    assessments = relationship("Assessment", back_populates="class_room", cascade="all, delete-orphan")
    groups = relationship("LearningGroup", back_populates="class_room", cascade="all, delete-orphan")


class Assessment(Base):
    """One administration of a quick foundational assessment (or reassessment)."""

    __tablename__ = "assessments"

    id = Column(String, primary_key=True, index=True, default=_uuid)
    class_id = Column(String, ForeignKey("class_rooms.id"), nullable=False, index=True)
    teacher_id = Column(String, ForeignKey("teachers.id"), nullable=False, index=True)
    subject = Column(String, nullable=False, default="mathematics")
    title = Column(String, nullable=False)
    template_key = Column(String, nullable=True)     # framework template, null = custom paper
    # Reassessment support (the ACT → REASSESS part of the loop)
    is_reassessment = Column(Boolean, default=False)
    group_id = Column(String, ForeignKey("learning_groups.id"), nullable=True, index=True)
    intervention_id = Column(String, ForeignKey("interventions.id"), nullable=True, index=True)
    target_competency = Column(String, nullable=True)  # competency id for reassessments
    # Generated quick-check questions for reassessments: [{number, text, correct_answer, competencies}]
    questions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_now)

    class_room = relationship("ClassRoom", back_populates="assessments")
    worksheets = relationship("Worksheet", back_populates="assessment")
    intervention = relationship("Intervention", back_populates="reassessments")


class Evidence(Base):
    """
    Competency-level learning evidence for one student.

    This is deliberately NOT a score: it records what the child demonstrated,
    where the evidence is thin, and what the teacher decided (teacher-in-the-loop).
    """

    __tablename__ = "evidence"
    __table_args__ = (
        Index("ix_evidence_student_competency", "student_id", "competency_id"),
    )

    id = Column(String, primary_key=True, index=True, default=_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    class_id = Column(String, ForeignKey("class_rooms.id"), nullable=True, index=True)
    competency_id = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=False, default="mathematics")
    # demonstrated | developing | needs_support
    status = Column(String, nullable=False, default="needs_support")
    # high | medium | needs_verification
    confidence = Column(String, nullable=False, default="needs_verification")
    observation = Column(JSON, nullable=True)   # structured: {"observed": ..., "evidence": [...]}
    source_assessment_id = Column(String, ForeignKey("assessments.id"), nullable=True)
    # teacher-in-the-loop: confirmed | edited | verify (null = not yet reviewed)
    teacher_review = Column(String, nullable=True)
    teacher_note = Column(String, nullable=True)
    created_at = Column(DateTime, default=_now)

    student = relationship("Student")


class EvaluationNote(Base):
    """
    Internal evaluation-mode record: AI prediction vs teacher ground truth.
    Used to measure whether Kagaz actually works (never shown to children).
    """

    __tablename__ = "evaluation_notes"

    id = Column(String, primary_key=True, index=True, default=_uuid)
    worksheet_id = Column(String, nullable=True, index=True)
    student_id = Column(String, nullable=True, index=True)
    subject = Column(String, default="mathematics")
    kind = Column(String, default="pattern")     # pattern | ocr | recommendation
    ai_prediction = Column(String, nullable=True)
    teacher_label = Column(String, nullable=True)  # correct | incorrect
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=_now)


class EvaluationRecord(Base):
    """
    Rich internal evaluation record: AI prediction vs teacher ground truth.
    One row per analyzed question/student combination.
    Used to compute prototype metrics — never shown to children.
    """

    __tablename__ = "evaluation_records"

    id = Column(String, primary_key=True, index=True, default=_uuid)
    assessment_id = Column(String, nullable=True, index=True)
    worksheet_id = Column(String, nullable=True, index=True)
    student_id = Column(String, nullable=True, index=True)
    student_name = Column(String, nullable=True)
    subject = Column(String, default="mathematics")

    # ── OCR accuracy ────────────────────────────────────────────────────────
    ai_extracted_answer = Column(String, nullable=True)
    teacher_corrected_answer = Column(String, nullable=True)
    ocr_was_correct = Column(Boolean, nullable=True)  # null = not evaluated yet

    # ── Competency classification ───────────────────────────────────────────
    ai_competency = Column(String, nullable=True)          # predicted competency id
    ground_truth_competency = Column(String, nullable=True) # teacher-confirmed
    competency_match = Column(Boolean, nullable=True)       # null = not evaluated yet

    # ── Learning-gap prediction ──────────────────────────────────────────────
    ai_learning_gap = Column(String, nullable=True)       # AI-predicted gap description
    teacher_confirmed_gap = Column(String, nullable=True)  # teacher-confirmed gap (null = agreement)
    gap_agrees = Column(Boolean, nullable=True)            # null = not evaluated yet

    # ── Confidence & recommendation ──────────────────────────────────────────
    confidence = Column(String, nullable=True)              # high | medium | needs_verification
    recommendation = Column(String, nullable=True)          # AI-suggested action text
    teacher_accepted_recommendation = Column(Boolean, nullable=True)  # null = not evaluated yet

    # ── Processing metadata ──────────────────────────────────────────────────
    processing_time_ms = Column(Float, nullable=True)

    # ── Metadata ─────────────────────────────────────────────────────────────
    evaluated_by = Column(String, nullable=True)   # teacher_id who did the evaluation
    notes = Column(String, nullable=True)           # free-text notes from evaluator
    created_at = Column(DateTime, default=_now)
    evaluated_at = Column(DateTime, nullable=True)  # when the teacher evaluated it


class LearningGroup(Base):
    """A competency-based learning group (never a public ranking)."""

    __tablename__ = "learning_groups"

    id = Column(String, primary_key=True, index=True, default=_uuid)
    class_id = Column(String, ForeignKey("class_rooms.id"), nullable=False, index=True)
    name = Column(String, nullable=False)             # "Group A" …
    tier = Column(String, default="0")                # framework tier key "0".."4"
    focus_competency = Column(String, nullable=True)  # dominant competency id
    focus_label = Column(String, nullable=True)       # teacher-friendly focus text
    recommended_activity = Column(String, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)

    class_room = relationship("ClassRoom", back_populates="groups")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="group")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(String, primary_key=True, index=True, default=_uuid)
    group_id = Column(String, ForeignKey("learning_groups.id"), nullable=False, index=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    # active | ready_to_advance | continue_support
    status = Column(String, default="active")
    joined_at = Column(DateTime, default=_now)

    group = relationship("LearningGroup", back_populates="members")
    student = relationship("Student")


class Intervention(Base):
    """A short, low-TLM remediation activity for one group + one competency."""

    __tablename__ = "interventions"

    id = Column(String, primary_key=True, index=True, default=_uuid)
    group_id = Column(String, ForeignKey("learning_groups.id"), nullable=True, index=True)
    class_id = Column(String, ForeignKey("class_rooms.id"), nullable=True, index=True)
    target_competency = Column(String, nullable=True, index=True)
    title = Column(String, nullable=False)
    duration_minutes = Column(String, default="10")
    goal = Column(String, nullable=True)
    materials = Column(JSON, nullable=True)           # list of low-cost TLM strings
    teacher_steps = Column(JSON, nullable=True)       # ordered list of steps
    guided_practice = Column(JSON, nullable=True)     # list of questions
    independent_check = Column(JSON, nullable=True)
    mastery_check = Column(JSON, nullable=True)
    source = Column(String, default="library")        # library | generated
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)

    group = relationship("LearningGroup", back_populates="interventions")
    reassessments = relationship("Assessment", back_populates="intervention")


class ProgressEntry(Base):
    """Student competency status over time — the timeline is about skills, not marks."""

    __tablename__ = "progress_entries"
    __table_args__ = (
        Index("ix_progress_student_time", "student_id", "created_at"),
    )

    id = Column(String, primary_key=True, index=True, default=_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    competency_id = Column(String, nullable=True, index=True)
    # demonstrated | developing | needs_support
    status = Column(String, nullable=False)
    source = Column(String, default="assessment")     # assessment | reassessment | teacher
    assessment_id = Column(String, ForeignKey("assessments.id"), nullable=True)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=_now)

    student = relationship("Student")


# ── Extensions to the existing models (safe, nullable columns) ───────────────
# class_id / assessment_id / kind link a scan into the learning loop; the plain
# ad-hoc worksheet flow keeps working unchanged when these are null.
from app.models.worksheet import Worksheet, WorksheetItem  # noqa: E402
from app.models.student import Student  # noqa: E402

Worksheet.class_id = Column(String, ForeignKey("class_rooms.id"), nullable=True, index=True)
Worksheet.assessment_id = Column(String, ForeignKey("assessments.id"), nullable=True, index=True)
Worksheet.kind = Column(String, default="assessment")  # assessment | reassessment
Worksheet.assessment = relationship("Assessment", back_populates="worksheets")

WorksheetItem.teacher_corrected_answer = Column(String, nullable=True)

# Students belong to a class (nullable so legacy ad-hoc students keep working)
Student.class_id = Column(String, ForeignKey("class_rooms.id"), nullable=True, index=True)
Student.class_room = relationship("ClassRoom", back_populates="students")
