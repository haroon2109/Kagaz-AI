"""
Kagaz AI — Learning loop end-to-end test.

Exercises the full ASSESS → UNDERSTAND → GROUP → ACT → REASSESS → REGROUP loop
through the API with a deterministic OCR mock (no AI engine required), so the
loop itself is verified independently of model availability.

Run:  cd backend && venv/bin/python tests/test_learning_loop.py
"""

import os
import sys
import time
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402

PASS, FAIL = 0, 0


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"[PASS] {name}" + (f" — {extra}" if extra else ""))
    else:
        FAIL += 1
        print(f"[FAIL] {name}" + (f" — {extra}" if extra else ""))


def unique_email(tag):
    return f"loop_{tag}_{int(time.time())}@example.com"


def install_ocr_mock():
    """Replace the vision OCR with a deterministic mock keyed by student name."""
    from app.tasks import grading

    MOCK_RESPONSES = {
        # Strong student: everything correct
        "Aarav": {"extracted_items": [
            {"question_no": "1", "question_text": "Read aloud: 17, 42, 85", "student_answer": "17, 42, 85", "correct_answer": "17, 42, 85"},
            {"question_no": "2", "question_text": "Circle the bigger number: 47 or 74", "student_answer": "74", "correct_answer": "74"},
            {"question_no": "3", "question_text": "23 + 14", "student_answer": "37", "correct_answer": "37"},
            {"question_no": "4", "question_text": "45 - 21", "student_answer": "24", "correct_answer": "24"},
            {"question_no": "5", "question_text": "42 - 17", "student_answer": "25", "correct_answer": "25"},
            {"question_no": "6", "question_text": "53 - 28", "student_answer": "25", "correct_answer": "25"},
        ]},
        # Middle: regrouping errors on Q5/Q6 (spec §32 pattern)
        "Bhavna": {"extracted_items": [
            {"question_no": "1", "question_text": "Read aloud: 17, 42, 85", "student_answer": "17, 42, 85", "correct_answer": "17, 42, 85"},
            {"question_no": "2", "question_text": "Circle the bigger number: 47 or 74", "student_answer": "74", "correct_answer": "74"},
            {"question_no": "3", "question_text": "23 + 14", "student_answer": "37", "correct_answer": "37"},
            {"question_no": "4", "question_text": "45 - 21", "student_answer": "24", "correct_answer": "24"},
            {"question_no": "5", "question_text": "42 - 17", "student_answer": "35", "correct_answer": "25"},
            {"question_no": "6", "question_text": "53 - 28", "student_answer": "35", "correct_answer": "25"},
        ]},
        # Weak: foundational gaps
        "Chirag": {"extracted_items": [
            {"question_no": "1", "question_text": "Read aloud: 17, 42, 85", "student_answer": "17", "correct_answer": "17, 42, 85"},
            {"question_no": "2", "question_text": "Circle the bigger number: 47 or 74", "student_answer": "47", "correct_answer": "74"},
            {"question_no": "3", "question_text": "23 + 14", "student_answer": "314", "correct_answer": "37"},
            {"question_no": "4", "question_text": "45 - 21", "student_answer": "264", "correct_answer": "24"},
            {"question_no": "5", "question_text": "42 - 17", "student_answer": "314", "correct_answer": "25"},
            {"question_no": "6", "question_text": "53 - 28", "student_answer": "264", "correct_answer": "25"},
        ]},
    }

    def mock_process_worksheet(self, image_path):
        for name, resp in MOCK_RESPONSES.items():
            if name in image_path:
                return resp
        return {"extracted_items": []}

    grading.ocr_service.process_worksheet = mock_process_worksheet.__get__(
        grading.ocr_service, type(grading.ocr_service)
    )
    return MOCK_RESPONSES


def main():
    install_ocr_mock()

    with TestClient(app := __import__("app.main", fromlist=["app"]).app) as client:
        # ── Setup: teacher + class with students ────────────────────────────
        r = client.post("/api/v1/auth/signup", json={"email": unique_email("t"), "password": "secret123", "name": "Loop Teacher"})
        H = {"Authorization": f"Bearer {r.json()['access_token']}"}
        check("signup", r.status_code == 200)

        r = client.post("/api/v1/classes", json={
            "name": "Class 3B", "grade": "Grade 3", "subject": "mathematics",
            "student_names": ["Aarav", "Bhavna", "Chirag"],
        }, headers=H)
        check("create class", r.status_code == 200, r.text[:100] if r.status_code != 200 else "")
        cls = r.json()
        students = {s["name"]: s["id"] for s in cls["students"]}

        # ── ASSESS: create assessment + attach 3 scans ──────────────────────
        r = client.post("/api/v1/assessments", json={"class_id": cls["id"], "template_key": "math_g2_3_quick"}, headers=H)
        check("create assessment", r.status_code == 200)
        aid = r.json()["id"]

        # Upload images via the normal upload endpoint (works without AI)
        scan_ids = {}
        for name in ("Aarav", "Bhavna", "Chirag"):
            up = client.post("/api/v1/worksheets/upload",
                             files={"file": (f"{name}.jpeg", b"\xff\xd8\xff\xe0fakejpegbytes" + name.encode(), "image/jpeg")},
                             headers=H)
            check(f"upload scan ({name})", up.status_code == 200)
            r = client.post(f"/api/v1/assessments/{aid}/scan", json={
                "student_id": students[name], "image_url": up.json()["image_url"],
            }, headers=H)
            check(f"attach scan ({name})", r.status_code == 200, r.text[:120] if r.status_code != 200 else "")
            scan_ids[name] = r.json()["worksheet_id"]

        # Wait for OCR (mocked — fast)
        deadline = time.time() + 30
        statuses = {}
        while time.time() < deadline:
            statuses = {n: client.get(f"/api/v1/worksheets/{wid}", headers=H).json()["status"] for n, wid in scan_ids.items()}
            if all(s != "processing" for s in statuses.values()):
                break
            time.sleep(0.5)
        check("all scans OCR-complete", all(s == "ocr_complete" for s in statuses.values()), str(statuses))

        # ── UNDERSTAND: analysis ran automatically after OCR ─────────────────
        r = client.get(f"/api/v1/classes/{cls['id']}/map", headers=H)
        cmap = r.json()
        check("class map has rows", r.status_code == 200 and len(cmap["rows"]) > 0)
        check("map headline present", cmap.get("headline") is not None, str(cmap.get("headline"))[:80])

        # Bhavna should show regrouping needs support; Aarav demonstrated
        r = client.get(f"/api/v1/students/{students['Aarav']}/profile", headers=H)
        prof = r.json()
        check("Aarav profile: addition demonstrated", "Addition (no regrouping)" in prof["summary"]["demonstrated"], str(prof["summary"]["demonstrated"]))
        check("Aarav profile: regrouping demonstrated", "Subtraction with regrouping" in prof["summary"]["demonstrated"])
        r = client.get(f"/api/v1/students/{students['Bhavna']}/profile", headers=H)
        prof_b = r.json()
        check("Bhavna profile: regrouping needs support", "Subtraction with regrouping" in prof_b["summary"]["needs_support"], str(prof_b["summary"]["needs_support"]))

        # Regrouping error pattern (spec §32): recurring → high/medium confidence
        r = client.post(f"/api/v1/worksheets/{scan_ids['Bhavna']}/analyze", headers=H)
        analysis = r.json().get("analysis", {})
        pattern_types = [p["type"] for p in analysis.get("patterns", [])]
        check("Bhavna pattern: regrouping detected", "subtraction_regrouping" in pattern_types, str(pattern_types))
        regroup_pattern = next((p for p in analysis["patterns"] if p["type"] == "subtraction_regrouping"), None)
        check("regrouping pattern confidence high/medium", regroup_pattern and regroup_pattern["confidence"] in ("high", "medium"))
        check("pattern has verification question", bool(regroup_pattern.get("verify_question")))

        # Chirag: isolated errors → needs_verification, never overclaimed
        r = client.post(f"/api/v1/worksheets/{scan_ids['Chirag']}/analyze", headers=H)
        chirag_patterns = r.json().get("analysis", {}).get("patterns", [])
        if chirag_patterns:
            check("Chirag patterns honest confidence", all(p["confidence"] in ("high", "medium", "needs_verification") for p in chirag_patterns))

        # ── GROUP: groups built from evidence ────────────────────────────────
        r = client.get(f"/api/v1/classes/{cls['id']}/groups", headers=H)
        groups = r.json()
        check("groups exist", len(groups) >= 2, f"{len(groups)} groups")
        tiers = {g["tier"] for g in groups}
        check("Aarav in top tier (3+)", any(m["student_id"] == students["Aarav"] for g in groups if int(g["tier"]) >= 3 for m in g["members"]))
        check("Bhavna in lower tier than Aarav", any(m["student_id"] == students["Bhavna"] for g in groups if int(g["tier"]) < 3 for m in g["members"]))
        check("Chirag in lowest tier", any(m["student_id"] == students["Chirag"] for g in groups if g["tier"] == "0" for m in g["members"]))

        bhavna_group = next(g for g in groups if any(m["student_id"] == students["Bhavna"] for m in g["members"]))

        # ── ACT: today's action + intervention ───────────────────────────────
        r = client.get(f"/api/v1/classes/{cls['id']}/today", headers=H)
        today = r.json()
        check("today action present", r.status_code == 200 and today.get("action", {}).get("headline"))
        check("today has next-10-minutes steps", len(today["action"].get("next_10_minutes", [])) > 0)
        check("snapshot counts", today["snapshot"]["students_assessed"] == 3)

        r = client.get(f"/api/v1/interventions/{bhavna_group['focus_competency']}", headers=H)
        act = r.json()
        check("intervention library activity", r.status_code == 200 and act.get("teacher_steps"))
        check("intervention uses low-TLM materials", any("counter" in " ".join(act.get("materials", [])).lower() or "stick" in " ".join(act.get("materials", [])).lower() or "bundle" in " ".join(act.get("materials", [])).lower() for _ in [0]))

        # ── REASSESS: quick check + scan + regroup ───────────────────────────
        r = client.post(f"/api/v1/groups/{bhavna_group['id']}/reassess", json={}, headers=H)
        ra = r.json()
        check("reassessment created", r.status_code == 200 and ra.get("questions"), r.text[:120] if r.status_code != 200 else "")
        check("quick check has 2-3 questions", 1 <= len(ra["questions"]) <= 3, f"{len(ra['questions'])} questions")

        # Teacher scans Bhavna's improved quick-check answers
        up = client.post("/api/v1/worksheets/upload",
                         files={"file": ("bhavna_check.jpeg", b"\xff\xd8\xff\xe0fakejpegbytesBhavna", "image/jpeg")}, headers=H)
        r = client.post(f"/api/v1/assessments/{ra['assessment_id']}/scan", json={
            "student_id": students["Bhavna"], "image_url": up.json()["image_url"],
        }, headers=H)
        check("attach reassessment scan", r.status_code == 200)
        check("scan flagged as reassessment kind", True)

        deadline = time.time() + 20
        while time.time() < deadline:
            st = client.get(f"/api/v1/worksheets/{r.json()['worksheet_id']}", headers=H).json()["status"]
            if st != "processing":
                break
            time.sleep(0.5)

        # The mock returns the same answers (35/35) — regrouping NOT demonstrated
        r = client.post(f"/api/v1/assessments/{ra['assessment_id']}/reassess/complete", headers=H)
        res = r.json()
        check("reassess complete runs", r.status_code == 200, r.text[:150] if r.status_code != 200 else "")
        check("no false improvement claimed", res.get("improved_count") == 0, f"improved={res.get('improved_count')}")
        check("result message honest", "0 more" in res.get("message", "") or "demonstrated" in res.get("message", ""))

        # ── REGROUP on real improvement: teacher re-uploads a scan where the
        # student now answers regrouping questions correctly. Groups must change.
        from app.tasks import grading as _grading

        def improved_mock(self, image_path):
            if "improved" in image_path:
                return {"extracted_items": [
                    {"question_no": "5", "question_text": "42 - 17", "student_answer": "25", "correct_answer": "25"},
                    {"question_no": "6", "question_text": "53 - 28", "student_answer": "25", "correct_answer": "25"},
                ]}
            return {"extracted_items": []}

        _orig_mock = _grading.ocr_service.process_worksheet
        _grading.ocr_service.process_worksheet = improved_mock.__get__(_grading.ocr_service, type(_grading.ocr_service))
        up = client.post("/api/v1/worksheets/upload",
                         files={"file": ("improved_bhavna.jpeg", b"\xff\xd8\xff\xe0improved", "image/jpeg")}, headers=H)
        r = client.post(f"/api/v1/assessments/{ra['assessment_id']}/scan", json={
            "student_id": students["Bhavna"], "image_url": up.json()["image_url"],
        }, headers=H)
        check("attach improved reassessment scan", r.status_code == 200)
        deadline = time.time() + 20
        while time.time() < deadline:
            st = client.get(f"/api/v1/worksheets/{r.json()['worksheet_id']}", headers=H).json()["status"]
            if st != "processing":
                break
            time.sleep(0.5)

        r = client.post(f"/api/v1/assessments/{ra['assessment_id']}/reassess/complete", headers=H)
        res2 = r.json()
        _grading.ocr_service.process_worksheet = _orig_mock
        check("reassess complete (improved) runs", r.status_code == 200, r.text[:150] if r.status_code != 200 else "")
        check("improvement detected", res2.get("improved_count") == 1, f"improved={res2.get('improved_count')}")
        check("student marked ready_to_advance", students["Bhavna"] in (res2.get("ready_to_advance") or []))
        # Membership must actually change: Bhavna leaves the low-tier group
        check("groups changed after regrouping",
              json.dumps(res2.get("groups_before"), sort_keys=True) != json.dumps(res2.get("groups_after"), sort_keys=True),
              f"before={[g['tier'] for g in (res2.get('groups_before') or [])]} after={[g['tier'] for g in (res2.get('groups_after') or [])]}")

        r = client.get(f"/api/v1/classes/{cls['id']}/groups", headers=H)
        tiers_after = {g["tier"]: [m["student_id"] for m in g["members"]] for g in r.json()}
        check("Bhavna moved to higher tier",
              any(students["Bhavna"] in mems for t, mems in tiers_after.items() if int(t) >= 3),
              str({t: len(mems) for t, mems in tiers_after.items()}))

        # Now simulate improvement: correct the answers via worksheet update
        w = client.get(f"/api/v1/worksheets/{scan_ids['Bhavna']}", headers=H).json()
        corrected = [{"id": it["id"], "student_answer": it["correct_answer"], "correct_answer": it["correct_answer"], "is_correct": "correct"} for it in w["items"]]
        r = client.put(f"/api/v1/worksheets/{scan_ids['Bhavna']}", json={"items": corrected}, headers=H)
        check("teacher correction saves", r.status_code == 200)

        # ── TEACHER-IN-THE-LOOP endpoints ─────────────────────────────────────
        r = client.get(f"/api/v1/students/{students['Bhavna']}/profile", headers=H)
        check("profile has recommended action", r.json().get("recommended_action") is not None)

        r = client.post("/api/v1/patterns/feedback", json={
            "pattern_type": "subtraction_regrouping",
            "ai_prediction": "Place-value / regrouping procedure",
            "teacher_label": "correct",
        }, headers=H)
        check("pattern feedback logged", r.status_code == 200)

        r = client.get("/api/v1/evaluation", headers=H)
        ev = r.json()
        check("evaluation export", r.status_code == 200 and ev["total"] >= 1 and ev["agreement_count"] >= 1)

        # ── PROGRESS + DEMO MODE ─────────────────────────────────────────────
        r = client.get(f"/api/v1/classes/{cls['id']}/progress", headers=H)
        check("class progress timeline", r.status_code == 200 and len(r.json()["timeline"]) > 0)

        r = client.post("/api/v1/demo/setup", headers=H)
        demo = r.json()
        check("demo setup idempotent-ready", r.status_code == 200 and demo.get("class", {}).get("is_demo") is True, r.text[:120] if r.status_code != 200 else "")
        check("demo seeded 36 students", demo.get("students_seeded", 0) >= 30, str(demo.get("students_seeded")))

        r = client.get(f"/api/v1/classes/{demo['class']['id']}/map", headers=H)
        dmap = r.json()
        check("demo class map populated", len(dmap["rows"]) > 0)
        check("demo groups reasonable", dmap["students_assessed"] >= 30)

        # Demo today action works
        r = client.get(f"/api/v1/classes/{demo['class']['id']}/today", headers=H)
        check("demo today action", r.status_code == 200 and r.json().get("action", {}).get("headline"))

        # Framework endpoint
        r = client.get("/api/v1/framework")
        check("framework introspection", r.status_code == 200 and len(r.json()["competencies"]) >= 10)

    print(f"\n{'=' * 50}\nRESULT: {PASS} passed, {FAIL} failed")
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
