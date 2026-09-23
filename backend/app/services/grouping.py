"""
Kagaz AI — Grouping engine, remediation generator and "Today's Action".

Deterministic, framework-driven:
  • Grouping: students join the learning group whose tier matches their
    demonstrated competencies (never a marks-based ranking).
  • Remediation: activities come from the intervention library (low-TLM,
    ~10 minutes) — only generated AFTER a learning need is identified.
  • Today's Action: the single most impactful next step for the class.
"""

import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional

from app.services.framework import (
    COMPETENCIES,
    TIERS,
    TIER_ORDER,
    competency_label,
    intervention_for,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Grouping
# ─────────────────────────────────────────────────────────────────────────────

def _tier_sort_key(cid_status: Dict[str, str], tier: str) -> int:
    """Students sort into the highest tier whose requirements they satisfy."""
    return int(tier)


def build_groups_from_evidence(
    students_evidence: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    students_evidence: [{student_id, name, tier_hint, summary, competencies}]
    Returns group dicts keyed by tier with members, focus and activity.
    """
    buckets: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for se in students_evidence:
        tier = se.get("tier_hint") or "0"
        buckets[tier].append(se)

    groups: List[Dict[str, Any]] = []
    for tier in TIER_ORDER:
        members = buckets.get(tier, [])
        if not members:
            continue
        tinfo = TIERS[tier]
        # Focus = the most common 'needs_support'/'developing' competency in the group
        counter: Dict[str, int] = defaultdict(int)
        for m in members:
            for cid in (m.get("summary", {}).get("needs_support") or []) + (m.get("summary", {}).get("developing") or []):
                counter[cid] += 1
        focus_cid = max(counter, key=counter.get) if counter else None
        # Fall back to the tier's first unmet requirement
        if not focus_cid:
            focus_cid = next(
                (r for r in tinfo["requires"] if r not in members[0].get("summary", {}).get("demonstrated", [])),
                None,
            )
        groups.append({
            "tier": tier,
            "name": tinfo["group_name"],
            "label": tinfo["label"],
            "focus_competency": focus_cid,
            "focus_label": competency_label(focus_cid) if focus_cid else tinfo["description"],
            "recommended_activity": tinfo["activity"],
            "member_count": len(members),
            "members": [
                {
                    "student_id": m["student_id"],
                    "name": m.get("name", ""),
                    "status": "active",
                }
                for m in members
            ],
        })
    return groups


# ─────────────────────────────────────────────────────────────────────────────
# Remediation generator (library-first; LLM optional adaptation only)
# ─────────────────────────────────────────────────────────────────────────────

def build_intervention(target_competency: str, source: str = "library") -> Optional[Dict[str, Any]]:
    """Build a 10-minute remediation activity for a learning gap."""
    act = intervention_for(target_competency)
    if not act:
        comp = COMPETENCIES.get(target_competency, {})
        act = {
            "title": f"Practice: {comp.get('label', target_competency)}",
            "duration_minutes": "10",
            "goal": f"Strengthen {comp.get('label', target_competency).lower()}.",
            "materials": ["Blackboard", "Notebooks"],
            "teacher_steps": [
                f"Demonstrate one example of {comp.get('label', target_competency).lower()} on the board.",
                "Solve one example together.",
                "Give 3 guided problems.",
                "Give 1 independent problem.",
                "Run the quick check.",
            ],
            "guided_practice": [],
            "independent_check": [],
            "mastery_check": [],
        }
        act["target_competency"] = target_competency
    act["source"] = source
    return act


def today_action(groups: List[Dict[str, Any]], interventions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    The single most impactful next teaching action: the largest group with an
    unmet focus competency gets the headline; the rest are listed below.
    """
    if not groups:
        return {}

    def group_priority(g: Dict[str, Any]) -> int:
        # Lower tier (weaker foundations) first, then larger group
        return (int(g.get("tier", "0")), -g.get("member_count", 0))

    primary = sorted(groups, key=group_priority)[0]
    primary_intervention = next(
        (i for i in interventions if i.get("target_competency") == primary.get("focus_competency")),
        None,
    )

    steps = (primary_intervention or {}).get("teacher_steps") or [
        "Demonstrate the skill with concrete materials.",
        "Solve one example together.",
        "Give 3 guided problems.",
        "Give 1 independent problem.",
        "Run the quick check.",
    ]

    return {
        "headline": f"Do not move on yet — {primary.get('focus_label', 'a foundational skill')} needs work first.",
        "primary_group": primary,
        "recommended_activity": primary.get("recommended_activity"),
        "next_10_minutes": steps[:5],
        "materials": (primary_intervention or {}).get("materials") or ["Counters/pebbles", "Blackboard"],
        "warm_up": {
            "title": "Recommended 3-minute warm-up",
            "description": "Use 10 counters/pebbles to demonstrate the skill concretely before practice.",
        },
        "group_actions": [
            {
                "group_name": g.get("name"),
                "member_count": g.get("member_count"),
                "focus": g.get("focus_label"),
                "action": g.get("recommended_activity"),
                "intervention_id": next(
                    (i.get("id") for i in interventions if i.get("target_competency") == g.get("focus_competency")),
                    None,
                ),
            }
            for g in sorted(groups, key=group_priority)
        ],
        "quick_check": {
            "instruction": "After the activity, run the 2-question quick check with the group.",
            "reassess_hint": "Scan their answers with Kagaz — groups update automatically.",
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Regrouping after reassessment
# ─────────────────────────────────────────────────────────────────────────────

def regroup_after_reassessment(
    previous_members: List[Dict[str, Any]],
    reassessment_results: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    """
    previous_members: [{student_id, name, status}]
    reassessment_results: {student_id: analysis dict from evidence.analyze_responses}
    Returns {ready_to_advance: [...], continue_support: [...], delta_text: str}
    """
    ready, cont = [], []
    for m in previous_members:
        sid = m["student_id"]
        res = reassessment_results.get(sid)
        if not res:
            cont.append(m)
            continue
        target_status = None
        # success = the reassessment's target competencies are demonstrated/developing
        competencies = res.get("competencies", {})
        target_status = [
            c.get("status") for c in competencies.values()
            if c.get("status") in ("demonstrated", "developing")
        ]
        if target_status and len(target_status) >= max(1, len(competencies) // 2):
            ready.append(m)
        else:
            cont.append(m)

    n_ready, n_cont = len(ready), len(cont)
    delta_text = (
        f"{n_ready} student(s) demonstrated the target skill; "
        f"{n_cont} still need support."
    )
    return {
        "ready_to_advance": ready,
        "continue_support": cont,
        "delta_text": delta_text,
    }
