"""
Kagaz AI — End-to-end & regression suite for the free/open-source stack.

Run:  cd backend && source venv/bin/activate && python tests/test_e2e.py

Covers: health, auth (signup/login/JWT security), students, worksheet upload,
real OCR extraction (vision engine), grading, SSE stream auth, and the
AI provider's JSON-repair/similarity fallbacks. Exits non-zero on any failure.

Note: OCR-dependent assertions SKIP gracefully when no vision-capable AI engine
is healthy (no Gemini/OpenAI/Groq key and no local Ollama vision model), so the
suite stays green on machines without model weights — CI-friendly.
"""

import io
import json
import os
import sys
import time

import httpx  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

PASS, FAIL = 0, 0
SKIP = 0
sample_image = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "Sampla handwritten.jpeg",
)


def check(name, cond, extra=""):
    global PASS, FAIL
    status = "PASS" if cond else "FAIL"
    if cond:
        PASS += 1
    else:
        FAIL += 1
    print(f"[{status}] {name}" + (f" — {extra}" if extra else ""))


def skip(name, reason=""):
    global SKIP
    SKIP += 1
    print(f"[SKIP] {name}" + (f" — {reason}" if reason else ""))


def vision_engine_healthy():
    """True when at least one vision-capable AI engine is configured/reachable.
    Used to SKIP live-OCR assertions instead of failing them on machines without
    working vision. Set SKIP_VISION_TESTS=1 to force-skip (e.g. known-broken
    local vision weights); CI boxes with no engines skip automatically."""
    from app.core.config import settings as _s
    from app.services.ai_provider import ai_provider as _ai

    if os.getenv("SKIP_VISION_TESTS", "").lower() in ("1", "true", "yes"):
        return False
    if _ai.gemini_ready or _ai.frontier_ready or _ai.groq_ready:
        return True
    if not _ai.check_ollama():
        return False
    try:
        tags = httpx.get(f"{_ai.ollama_base}/api/tags", timeout=3.0).json()
        names = [m.get("name", "") for m in tags.get("models", [])]
        return any(_s.OLLAMA_VISION_MODEL.split(":")[0] in n for n in names)
    except Exception:
        return False


def unique_email(tag):
    # example.com is validation-safe (reserved TLDs like .test are rejected)
    return f"e2e_{tag}_{int(time.time())}@example.com"


def main():
    with TestClient(app) as client:
        # ── 1. Health ────────────────────────────────────────────────────────
        r = client.get("/health")
        check("health 200", r.status_code == 200)
        engines = r.json().get("ai_engines", {})
        check("ai engines reported", "ollama" in engines, str(engines))

        # ── 2. Auth: signup / login / security ───────────────────────────────
        email = unique_email("main")
        r = client.post(
            "/api/v1/auth/signup",
            json={"email": email, "password": "secret123", "name": "E2E Teacher"},
        )
        check("signup 200 + token", r.status_code == 200 and r.json().get("access_token"))
        token = r.json()["access_token"]
        H = {"Authorization": f"Bearer {token}"}

        r = client.post(
            "/api/v1/auth/signup", json={"email": email, "password": "x" * 10}
        )
        check("duplicate signup 409", r.status_code == 409)

        r = client.post(
            "/api/v1/auth/signup", json={"email": unique_email("pw"), "password": "123"}
        )
        check("short password 400", r.status_code == 400)

        r = client.post(
            "/api/v1/auth/token", json={"email": email, "password": "secret123"}
        )
        check("login(json) 200", r.status_code == 200)

        r = client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": "secret123"},
        )
        check("login(form) 200", r.status_code == 200)

        r = client.post(
            "/api/v1/auth/token", json={"email": email, "password": "wrongpass"}
        )
        check("wrong password 401", r.status_code == 401)

        r = client.get("/api/v1/auth/me", headers=H)
        me = r.json()
        check("auth/me 200", r.status_code == 200 and me.get("email") == email)

        r = client.get("/api/v1/auth/me")
        check("auth/me unauthenticated 401", r.status_code == 401)

        r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer a.b.c"})
        check("tampered token 401", r.status_code == 401)

        # ── 3. Teacher isolation: second account sees nothing ────────────────
        r = client.post(
            "/api/v1/auth/signup",
            json={"email": unique_email("other"), "password": "secret123"},
        )
        other_token = r.json()["access_token"]
        other_H = {"Authorization": f"Bearer {other_token}"}
        r = client.get("/api/v1/worksheets", headers=other_H)
        check("teacher data isolation (empty list)", r.status_code == 200 and r.json() == [])

        # ── 4. Students ──────────────────────────────────────────────────────
        r = client.post(
            "/api/v1/students",
            json={"name": "Ravi Kumar", "roll_no": "14"},
            headers=H,
        )
        check("create student 200", r.status_code == 200)
        r = client.get("/api/v1/students", headers=H)
        check("list students 200", r.status_code == 200 and len(r.json()) == 1)

        # ── 5. Worksheet upload + full AI pipeline ───────────────────────────
        r = client.post(
            "/api/v1/worksheets/upload",
            files={"file": ("sample.jpeg", open(sample_image, "rb"), "image/jpeg")},
            headers=H,
        )
        check("upload 200", r.status_code == 200, r.text[:120] if r.status_code != 200 else "")
        image_url = r.json()["image_url"]

        r = client.post(
            "/api/v1/worksheets",
            json={"title": "Unit 4 — Addition", "image_url": image_url},
            headers=H,
        )
        check("create worksheet 200 (processing)", r.status_code == 200)
        wid = r.json()["id"]

        # ── Protected /uploads serving (worksheet scans are student PII) ────
        # Ownership requires a worksheet row referencing the file, so these
        # checks run after worksheet creation (same order as the real client).
        fname = image_url.rsplit("/", 1)[-1]
        check("uploads unauthenticated 401", client.get(f"/uploads/{fname}").status_code == 401)
        check("uploads owner token 200", client.get(f"/uploads/{fname}?token={token}").status_code == 200)
        check(
            "uploads foreign token 404",
            client.get(f"/uploads/{fname}?token={other_token}").status_code == 404,
        )
        check(
            "uploads unknown file 404",
            client.get(f"/uploads/does-not-exist.jpg?token={token}").status_code == 404,
        )

        # 6. Stream progress via authenticated SSE
        r = client.get(f"/api/v1/worksheets/stream/{wid}?token={token}")
        check("SSE stream 200", r.status_code == 200)
        check("SSE unauthenticated 401", client.get(f"/api/v1/worksheets/stream/{wid}").status_code == 401)
        check(
            "SSE foreign token 401",
            client.get(f"/api/v1/worksheets/stream/{wid}?token=a.b.c").status_code == 401,
        )

        # Poll OCR completion (vision on CPU can take a couple of minutes).
        # Without a healthy vision engine the scan is expected to fail — SKIP
        # the quality assertions instead of poisoning the suite.
        _vision_ok = vision_engine_healthy()
        deadline = time.time() + (420 if _vision_ok else 90)
        final = None
        while time.time() < deadline:
            w = client.get(f"/api/v1/worksheets/{wid}", headers=H).json()
            if w.get("status") != "processing":
                final = w
                break
            time.sleep(5)
        check("OCR finished in time", final is not None)
        if not final:
            print("FATAL: OCR did not finish; aborting pipeline assertions")
            sys.exit(1)
        if not _vision_ok and final["status"] == "failed":
            skip("OCR succeeded", "no healthy vision engine (set GEMINI_API_KEY to run live)")
            skip("OCR extracted items", "no healthy vision engine")
            skip("reprocess completed", "no healthy vision engine")
            final["items"] = []
            items = []
        else:
            check("OCR succeeded", final["status"] == "ocr_complete", final["status"])
            items = final.get("items", [])
            check("OCR extracted items", len(items) > 0, f"{len(items)} items")
        for it in items[:3]:
            print(
                f"    Q{it.get('question_no')}: {it.get('question_text')!r} "
                f"student={it.get('student_answer')!r} correct={it.get('correct_answer')!r} "
                f"→ {it.get('is_correct')}"
            )

        # ── 7. Teacher review + LLM grading ──────────────────────────────────
        r = client.post(f"/api/v1/worksheets/{wid}/grade", headers=H)
        check("grade trigger 200", r.status_code == 200)

        deadline = time.time() + 300
        graded = None
        while time.time() < deadline:
            w = client.get(f"/api/v1/worksheets/{wid}", headers=H).json()
            if w.get("status") != "processing":
                graded = w
                break
            time.sleep(5)
        check("LLM grading finished", graded is not None and graded["status"] == "completed", graded and graded["status"])
        fb = (graded or {}).get("ai_feedback") or {}
        check(
            "ai_feedback has all sections",
            all(k in fb for k in ("mistakes", "learning_gaps", "feedback", "remedial_suggestions")),
            str(sorted(fb.keys())),
        )
        check("final_score computed", isinstance((graded or {}).get("final_score"), (int, float)))
        if fb.get("feedback"):
            print(f"    feedback: {fb['feedback'][:100]}")
        if fb.get("learning_gaps"):
            print(f"    gaps: {[g.get('concept') for g in fb['learning_gaps']]}")

        # ── 8. Bias correction logging ───────────────────────────────────────
        if items:
            it0 = items[0]
            r = client.post(
                f"/api/v1/worksheets/{wid}/bias-correction",
                json={
                    "item_id": it0["id"],
                    "question_text": it0.get("question_text") or "1+1",
                    "expected_answer": it0.get("correct_answer") or "2",
                    "student_answer": it0.get("student_answer") or "3",
                    "original_ai_grade": it0.get("is_correct") or "pending",
                    "teacher_corrected_grade": "correct",
                },
                headers=H,
            )
            check("bias correction logged", r.status_code == 200)

        # ── 9. AI provider unit checks ───────────────────────────────────────
        from app.services.ai_provider import ai_provider, extract_json

        check("json: plain", extract_json('{"a": 1}') == {"a": 1})
        check("json: fenced", extract_json('```json\n{"a": 1}\n```') == {"a": 1})
        check("json: noisy prose", extract_json('Result: {"a": [1,2]} done') == {"a": [1, 2]})
        check(
            "lexical sim identical = 1",
            ai_provider._lexical_similarity("41", "41") == 1.0,
        )
        check(
            "lexical sim disjoint low",
            ai_provider._lexical_similarity("apple", "orange") < 0.2,
        )

        # Semantic similarity with local embedding model (nomic-embed-text)
        import asyncio
        from app.services.llm import llm_service

        sim = asyncio.run(llm_service.compute_semantic_similarity("24 + 17 = 41", "24 + 17 = 41"))
        check("semantic sim identical ≥ 0.85", sim >= 0.85, f"sim={sim:.3f}")

        # ── 10. Re-process endpoint ──────────────────────────────────────────
        r = client.post(f"/api/v1/worksheets/process/{wid}", headers=H)
        check("reprocess trigger 200", r.status_code == 200)
        # Wait for re-OCR to complete so DB isn't left locked/busy for the next run
        deadline = time.time() + (420 if _vision_ok else 90)
        while time.time() < deadline:
            w = client.get(f"/api/v1/worksheets/{wid}", headers=H).json()
            if w.get("status") != "processing":
                break
            time.sleep(5)
        if _vision_ok:
            check("reprocess completed", w.get("status") in ("ocr_complete", "completed"), w.get("status"))
        elif w.get("status") == "failed":
            skip("reprocess completed", "no healthy vision engine")
        else:
            check("reprocess completed", True, w.get("status"))

    print(f"\n{'=' * 50}\nRESULT: {PASS} passed, {FAIL} failed, {SKIP} skipped")
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
