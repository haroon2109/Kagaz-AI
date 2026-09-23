"""
Kagaz AI — Learning Evidence Engine (deterministic core).

Turns extracted student responses into competency evidence WITHOUT an LLM:
  1. Maps each question to competencies (framework templates or parsed question
     text, e.g. "42 - 17" → subtraction with regrouping).
  2. Marks each competency demonstrated / developing / needs_support.
  3. Detects recurring error patterns across items (never from a single error).
  4. Emits confidence: high | medium | needs_verification.

The LLM is NOT in this path. Deterministic rules keep the pedagogy auditable
and the demo honest; the LLM only reads messy handwriting upstream (OCR) and
can phrase teacher-friendly text downstream.
"""

import re
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from app.services.framework import (
    COMPETENCIES,
    SUBTREE,
    template_questions,
)

# ─────────────────────────────────────────────────────────────────────────────
# Question → competency mapping
# ─────────────────────────────────────────────────────────────────────────────

_ADD_RE = re.compile(r"^\s*(\d+)\s*\+\s*(\d+)\s*$")
_SUB_RE = re.compile(r"^\s*(\d+)\s*[-−–]\s*(\d+)\s*$")
_MUL_RE = re.compile(r"^\s*(\d+)\s*[x×*]\s*(\d+)\s*$", re.IGNORECASE)


def parse_math_expression(text: str) -> Optional[Tuple[str, int, int]]:
    """Parse '23 + 14' / '45 - 21' / '3 x 4' → (op, a, b); else None."""
    if not text:
        return None
    text = text.replace("−", "-").replace("–", "-").replace("×", "x")
    m = _ADD_RE.match(text)
    if m:
        return ("+", int(m.group(1)), int(m.group(2)))
    m = _SUB_RE.match(text)
    if m:
        return ("-", int(m.group(1)), int(m.group(2)))
    m = _MUL_RE.match(text)
    if m:
        return ("x", int(m.group(1)), int(m.group(2)))
    return None


def competencies_for_question(
    question_text: str,
    template_key: Optional[str] = None,
    question_no: Optional[str] = None,
) -> List[str]:
    """
    Map a question to competencies. Template questions use the framework's
    declared mapping; free-form math expressions are parsed from the text.
    """
    if template_key and question_no is not None:
        for q in template_questions(template_key):
            if str(q["number"]) == str(question_no):
                return list(q.get("competencies", []))

    text = (question_text or "").strip()
    parsed = parse_math_expression(text)
    if parsed:
        op, a, b = parsed
        if op == "+":
            # ones digits sum > 9 → regrouping involved
            if (a % 10) + (b % 10) > 9:
                # NOTE: no-regroup skill is measured by dedicated questions;
                # a regrouping question only implicates regrouping + place value.
                return ["MATH_ADD_REGROUP", "MATH_PLACE_VALUE"]
            return ["MATH_ADD_NO_REGROUP", "MATH_PLACE_VALUE"]
        if op == "-":
            # ones digit of minuend < subtrahend → borrowing required
            if (a % 10) < (b % 10):
                return ["MATH_SUB_REGROUP", "MATH_PLACE_VALUE"]
            return ["MATH_SUB_NO_REGROUP", "MATH_PLACE_VALUE"]
        if op == "x":
            return ["MATH_MULTIPLY"]

    lowered = text.lower()
    if any(w in lowered for w in ("read aloud", "read these numbers", "read the number")):
        return ["MATH_NUM_RECOG"]
    if any(w in lowered for w in ("bigger", "smaller", "greater", "circle the")):
        return ["MATH_COMPARE", "MATH_PLACE_VALUE"]
    if any(w in lowered for w in ("letter", "sound")):
        return ["LANG_LETTER_REC", "LANG_LETTER_SOUND"]
    if "word" in lowered:
        return ["LANG_WORD_DECODE"]
    if "sentence" in lowered:
        return ["LANG_SENTENCE_READ"]
    return []


def grade_numeric(expected: str, student: str) -> Optional[str]:
    """
    Deterministic numeric pre-grading. Returns "correct"/"incorrect" if BOTH
    answers parse as numbers, else None (caller should use other methods).

    Rationale: semantic-embedding and LLM graders can score transposed digits
    ('35' vs '53') as highly similar. For numeric answers, equality is the
    only defensible rule.
    """
    def _num(text):
        m = re.fullmatch(r"\s*[-+]?\d+(?:\.\d+)?\s*", str(text or ""))
        return float(m.group()) if m else None

    e, s = _num(expected), _num(student)
    if e is None or s is None:
        return None
    return "correct" if e == s else "incorrect"


def looks_non_numeric(expected: str) -> bool:
    """
    True when the expected answer is NOT primarily numeric (word answers,
    letters, sentences). Used to decide whether similarity/LLM grading is
    appropriate at all.
    """
    text = str(expected or "").strip()
    if not text:
        return False
    # Primarily digits (e.g. "47", "3/4", "1 2 3") → numeric family
    if re.search(r"\d", text):
        return False
    return True


def number_sequences_match(expected: str, student: str) -> bool:
    """
    Deterministic comparison for multi-number answers (e.g. oral number
    recognition: expected "17, 42, 85"). Both strings must yield the SAME
    numbers in the SAME order.
    """
    e = re.findall(r"-?\d+(?:\.\d+)?", str(expected or ""))
    s = re.findall(r"-?\d+(?:\.\d+)?", str(student or ""))
    if not e:
        return False
    return e == s


def answer_matches(expected: str, student: str) -> bool:
    """Numeric/lexical equality for short answers."""
    if expected is None or student is None:
        return False
    e = str(expected).strip()
    s = str(student).strip()
    if not e or not s:
        return False
    try:
        return float(e) == float(s)
    except ValueError:
        pass
    # ordered token comparison for oral/read-aloud answers ("17, 42, 85")
    et = re.findall(r"\d+", e)
    st = re.findall(r"\d+", s)
    if et and st:
        return et == st
    return e.lower() == s.lower()


# ─────────────────────────────────────────────────────────────────────────────
# Evidence computation for one student
# ─────────────────────────────────────────────────────────────────────────────

def _status_from_counts(correct: int, attempted: int) -> str:
    if attempted == 0:
        return "needs_support"
    ratio = correct / attempted
    if ratio >= 0.75:
        return "demonstrated"
    if ratio >= 0.4:
        return "developing"
    return "needs_support"


def _first_number(text: str) -> Optional[str]:
    m = re.search(r"\d+", text or "")
    return m.group(0) if m else None


def analyze_responses(
    items: List[Dict[str, Any]],
    subject: str = "mathematics",
    template_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Core evidence analysis for one student's extracted responses.

    items: [{question_no, question_text, student_answer, correct_answer,
             is_correct (optional)}]
    Returns:
      {
        "competencies": {cid: {label, status, confidence, evidence[], attempted, correct}},
        "patterns":     [observed error patterns],
        "needs_verification": [competency ids with thin evidence],
        "summary":      {demonstrated:[], developing:[], needs_support:[]},
        "tier_hint":    suggested learning-group tier,
        "raw_errors":   [...]
      }
    """
    per_comp: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "attempted": 0, "correct": 0, "evidence": [], "errors": []
    })
    raw_errors: List[Dict[str, Any]] = []

    for it in items or []:
        q_no = str(it.get("question_no", "?"))
        q_text = it.get("question_text") or ""
        s_ans = str(it.get("student_answer") or "").strip()
        c_ans = str(it.get("correct_answer") or "").strip()

        cids = competencies_for_question(q_text, template_key, q_no)
        if not cids:
            continue

        expected = c_ans or _expected_from_template(template_key, q_no)
        is_correct = it.get("is_correct")
        if is_correct not in ("correct", "incorrect", "pending"):
            is_correct = "correct" if answer_matches(expected, s_ans) else (
                "incorrect" if s_ans else "pending"
            )

        for idx, cid in enumerate(cids):
            bucket = per_comp[cid]
            entry = {
                "question_no": q_no,
                "question_text": q_text,
                "student_answer": s_ans,
                "correct_answer": expected,
            }
            if s_ans:
                bucket["attempted"] += 1
                if is_correct == "correct" or (
                    is_correct != "incorrect" and answer_matches(expected, s_ans)
                ):
                    bucket["correct"] += 1
                    bucket["evidence"].append({**entry, "result": "correct"})
                elif is_correct == "incorrect" and idx == 0:
                    # Record each raw error ONCE (against the primary competency)
                    # so pattern detection never double-counts multi-mapped items.
                    bucket["errors"].append({**entry, "result": "incorrect"})
                    raw_errors.append({**entry, "competency": cid})
            # unanswered items are not evidence either way

    competencies: Dict[str, Any] = {}
    needs_verification: List[str] = []
    for cid, bucket in per_comp.items():
        comp = COMPETENCIES.get(cid, {})
        status = _status_from_counts(bucket["correct"], bucket["attempted"])
        # Confidence rules (deterministic, explainable):
        #   Competency confidence → based on attempted data points (≥2 high).
        #   Pattern confidence    → based on recurring errors (≥3 high,
        #   2 medium, 1 isolated → needs_verification). A single response can
        #   NEVER yield high confidence — see detect_error_patterns.
        if bucket["attempted"] >= 2:
            confidence = "high"
        elif bucket["attempted"] == 1:
            confidence = "medium"
        else:
            confidence = "needs_verification"
            needs_verification.append(cid)
        competencies[cid] = {
            "label": comp.get("label", cid),
            "status": status,
            "confidence": confidence,
            "attempted": bucket["attempted"],
            "correct": bucket["correct"],
            "evidence": bucket["evidence"][:6],
            "errors": bucket["errors"][:6],
        }

    patterns = detect_error_patterns(raw_errors, total_questions=len(items or []))
    summary = {
        "demonstrated": sorted(
            [cid for cid, c in competencies.items() if c["status"] == "demonstrated"],
            key=lambda c: COMPETENCIES.get(c, {}).get("tier", 9),
        ),
        "developing": sorted(
            [cid for cid, c in competencies.items() if c["status"] == "developing"],
            key=lambda c: COMPETENCIES.get(c, {}).get("tier", 9),
        ),
        "needs_support": sorted(
            [cid for cid, c in competencies.items() if c["status"] == "needs_support"],
            key=lambda c: COMPETENCIES.get(c, {}).get("tier", 9),
        ),
    }

    return {
        "competencies": competencies,
        "patterns": patterns,
        "needs_verification": needs_verification,
        "summary": summary,
        "tier_hint": suggest_tier(competencies),
        "raw_errors": raw_errors,
    }


def _expected_from_template(template_key: Optional[str], question_no: Optional[str]) -> str:
    if not template_key or question_no is None:
        return ""
    for q in template_questions(template_key):
        if str(q["number"]) == str(question_no):
            return str(q.get("correct_answer", ""))
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Error-pattern detection — conservative, evidence-first
# ─────────────────────────────────────────────────────────────────────────────

def _classify_subtraction_error(a: int, b: int, given: int) -> Optional[str]:
    """Classify a wrong subtraction answer into an observable pattern."""
    correct = a - b
    no_borrow = (a % 10) - (b % 10)          # what you get if you subtract small-from-large
    abs_diff = abs(abs(given) - correct)

    # "small minus large" flipped: 42-17 → ones column computed as 7-2=5
    if (a % 10) < (b % 10) and given >= 0 and (given % 10) == (abs(no_borrow) % 10):
        return "subtraction_regrouping"
    # total-difference style off-by-ten errors (common place-value slip)
    if abs_diff in (10, 100):
        return "place_value"
    return "computation"


def _pattern_items(errs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Structured per-question evidence for the Why? view."""
    return [
        {
            "question_no": str(e.get("question_no", "")),
            "question_text": e.get("question_text", "") or "",
            "student_answer": e.get("student_answer", "") or "",
            "correct_answer": e.get("correct_answer", "") or "",
        }
        for e in errs
    ]


def _strength(confidence: str) -> str:
    return {"high": "High", "medium": "Medium"}.get(confidence, "Insufficient")


def _verify_note(confidence: str) -> str:
    if confidence == "high":
        return "Sufficient evidence — teacher confirmation optional."
    if confidence == "medium":
        return "Recommended: verify with 2 quick questions."
    return "Insufficient evidence. Recommended: verify with 2 quick questions."


def detect_error_patterns(
    raw_errors: List[Dict[str, Any]],
    total_questions: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Detect RECURRING patterns. Never returns a pattern from a single error —
    a lone mistake yields 'needs_verification' with a verification question.

    Every returned pattern carries the full explainability contract the
    "Why? / View Evidence" interaction needs (items, counts, confidence,
    verification guidance). A single response can NEVER yield high confidence.
    """
    patterns: List[Dict[str, Any]] = []
    by_type: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    for err in raw_errors:
        etype = "computation"
        parsed = parse_math_expression(err.get("question_text", ""))
        if parsed and parsed[0] == "-":
            try:
                etype = _classify_subtraction_error(
                    parsed[1], parsed[2], int(_first_number(err.get("student_answer", "")) or "0")
                )
            except ValueError:
                etype = "computation"
        by_type[etype].append(err)

    total = total_questions if total_questions else len(raw_errors)
    # Guard: denominator is questions analyzed, never inflated, never zero.
    total = max(total, len(raw_errors), 1)

    for etype, errs in by_type.items():
        if len(errs) >= 2:
            comp_ids = sorted({e.get("competency") for e in errs if e.get("competency")})
            primary = comp_ids[0] if comp_ids else None
            comp = COMPETENCIES.get(primary, {})
            samples = [
                f"Q{e['question_no']}: {e['question_text']} → {e['student_answer']} (correct: {e['correct_answer']})"
                for e in errs[:4]
            ]
            if etype == "subtraction_regrouping":
                gap_label = "Possible learning gap: subtraction with regrouping"
                pattern_desc = (
                    "Recurring pattern: subtracts the smaller digit from the larger "
                    "digit in the ones column instead of regrouping (borrowing)."
                )
                verify = COMPETENCIES["MATH_SUB_REGROUP"]["verify_question"]
            elif etype == "place_value":
                gap_label = "Possible learning gap: place-value/regrouping procedure"
                pattern_desc = (
                    "Recurring pattern: answers differ from correct by exactly ten — "
                    "tens/ones positions slipped during regrouping."
                )
                verify = COMPETENCIES["MATH_PLACE_VALUE"]["verify_question"]
            else:
                gap_label = f"Possible learning gap: {comp.get('label', 'Foundational operations')}"
                pattern_desc = "Recurring pattern: similar computation mistakes across questions."
                verify = comp.get("verify_question")
            confidence = "high" if len(errs) >= 3 else "medium"
            patterns.append({
                "type": etype,
                "observed": f"Observed in {len(errs)} of {total} questions.",
                "possible_gap": gap_label,
                "pattern_description": pattern_desc,
                "competency_id": primary,
                "items": _pattern_items(errs[:4]),
                "supporting_count": len(errs),
                "total_questions": total,
                "evidence": samples,
                "confidence": confidence,
                "evidence_strength": _strength(confidence),
                "needs_teacher_verification": confidence != "high",
                "verification_note": _verify_note(confidence),
                "verify_question": verify,
            })
        elif errs:
            # Single error → insufficient evidence. Be honest about it.
            e = errs[0]
            comp = COMPETENCIES.get(e.get("competency"), {})
            samples = [
                f"Q{e['question_no']}: wrote {e['student_answer']} (correct: {e['correct_answer']})"
            ]
            patterns.append({
                "type": "isolated_error",
                "observed": f"Observed in 1 of {total} questions.",
                "possible_gap": None,
                "pattern_description": "Only one response shows this mistake — not yet a recurring pattern.",
                "competency_id": e.get("competency"),
                "items": _pattern_items([e]),
                "supporting_count": 1,
                "total_questions": total,
                "evidence": samples,
                "confidence": "needs_verification",
                "evidence_strength": "Insufficient",
                "needs_teacher_verification": True,
                "verification_note": _verify_note("needs_verification"),
                "verify_question": comp.get("verify_question")
                or "Re-check: ask the child to solve one similar problem aloud.",
            })

    # Strongest patterns first
    order = {"subtraction_regrouping": 0, "place_value": 1, "computation": 2, "isolated_error": 3}
    patterns.sort(key=lambda p: order.get(p["type"], 9))
    return patterns


# ─────────────────────────────────────────────────────────────────────────────
# Tier suggestion for grouping
# ─────────────────────────────────────────────────────────────────────────────

def suggest_tier(competencies: Dict[str, Any]) -> str:
    """
    Highest tier the student's demonstrated evidence supports.

    Rules (deterministic, framework-driven — not LLM opinion):
      • A required competency blocks a tier only when it WAS tested and came
        back needs_support. Untested competencies never hold a child back —
        the group's focus activity will surface them.
      • requires_demonstrated sets must be fully demonstrated (e.g. regrouping
        must be shown, not just untested, to be 'ready to advance').
    """
    from app.services.framework import TIERS, TIER_ORDER

    best = "0"
    for tier in TIER_ORDER:
        tinfo = TIERS[tier]
        blocked = False
        for r in tinfo["requires"]:
            c = competencies.get(r)
            if c is not None and c.get("status") == "needs_support":
                blocked = True
                break
        if blocked:
            continue
        demo_required = tinfo.get("requires_demonstrated") or []
        if not all(competencies.get(r, {}).get("status") == "demonstrated" for r in demo_required):
            continue
        best = tier
    return best


def persist_evidence(
    db,
    student_id: str,
    class_id: Optional[str],
    analysis: Dict[str, Any],
    subject: str,
    source_assessment_id: Optional[str],
) -> List[Any]:
    """Write Evidence + ProgressEntry rows from an analysis dict."""
    from app.models.learning import Evidence, ProgressEntry

    rows: List[Evidence] = []
    # Index patterns by competency so each Evidence row carries the structured
    # "Why?" payload (items, counts, confidence, verification guidance).
    patterns_by_comp: Dict[str, Dict[str, Any]] = {}
    for p in analysis.get("patterns", []) or []:
        cid = p.get("competency_id")
        if cid and cid not in patterns_by_comp:
            patterns_by_comp[cid] = p
    for cid, c in analysis.get("competencies", {}).items():
        pattern = patterns_by_comp.get(cid, {})
        observation = {
            "attempted": c["attempted"],
            "correct": c["correct"],
            "evidence": c["evidence"][:3],
        }
        if pattern:
            observation["why"] = {
                "type": pattern.get("type"),
                "possible_gap": pattern.get("possible_gap"),
                "pattern_description": pattern.get("pattern_description"),
                "observed": pattern.get("observed"),
                "items": pattern.get("items", []),
                "supporting_count": pattern.get("supporting_count"),
                "total_questions": pattern.get("total_questions"),
                "evidence": pattern.get("evidence", []),
                "confidence": pattern.get("confidence"),
                "evidence_strength": pattern.get("evidence_strength"),
                "needs_teacher_verification": pattern.get("needs_teacher_verification"),
                "verification_note": pattern.get("verification_note"),
                "verify_question": pattern.get("verify_question"),
            }
        row = Evidence(
            student_id=student_id,
            class_id=class_id,
            competency_id=cid,
            subject=subject,
            status=c["status"],
            confidence=c["confidence"],
            observation=observation,
            source_assessment_id=source_assessment_id,
        )
        db.add(row)
        rows.append(row)
        db.add(ProgressEntry(
            student_id=student_id,
            competency_id=cid,
            status=c["status"],
            source="reassessment" if source_assessment_id else "assessment",
            assessment_id=source_assessment_id,
        ))
    return rows
