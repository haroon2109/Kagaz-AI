"""
Kagaz AI — Live-server smoke test.

Boots a REAL uvicorn server on a scratch port with a scratch database and a
mocked OCR engine (no AI required), then exercises real HTTP requests:
auth, upload validation, worksheet lifecycle when AI is DOWN, ownership
isolation, and CORS headers — the exact paths that break in deployment.

Run:  cd backend && venv/bin/python tests/test_live_smoke.py
"""

import os
import sys
import time
import uuid
import shutil
import tempfile
import subprocess
import urllib.request
import urllib.error
import json as jsonlib

PASS, FAIL = 0, 0


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"[PASS] {name}" + (f" — {extra}" if extra else ""))
    else:
        FAIL += 1
        print(f"[FAIL] {name}" + (f" — {extra}" if extra else ""))


def hget(headers, name):
    """Case-insensitive header lookup (uvicorn emits lowercase header names)."""
    return {k.lower(): v for k, v in (headers or {}).items()}.get(name.lower())


def req(method, url, headers=None, body=None, timeout=15):
    """Raw HTTP request returning (status, headers, parsed_json_or_text)."""
    r = urllib.request.Request(url, method=method, headers=headers or {})
    data = None
    if body is not None:
        if isinstance(body, (dict, list)):
            data = jsonlib.dumps(body).encode()
            r.add_header("Content-Type", "application/json")
        else:
            data = body
    try:
        with urllib.request.urlopen(r, data=data, timeout=timeout) as resp:
            raw = resp.read()
            try:
                return resp.status, dict(resp.headers), jsonlib.loads(raw)
            except Exception:
                return resp.status, dict(resp.headers), raw.decode(errors="replace")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, dict(e.headers), jsonlib.loads(raw)
        except Exception:
            return e.code, dict(e.headers), raw.decode(errors="replace")
    except Exception as e:
        return -1, {}, str(e)


def multipart_field(name, filename, content, ctype):
    return (name, filename, content, ctype)


def build_multipart(fields):
    boundary = uuid.uuid4().hex
    lines = []
    for name, filename, content, ctype in fields:
        lines.append(f"--{boundary}".encode())
        disp = f'Content-Disposition: form-data; name="{name}"'
        if filename:
            disp += f'; filename="{filename}"'
        lines.append(disp.encode())
        lines.append(f"Content-Type: {ctype}".encode())
        lines.append(b"")
        lines.append(content)
    lines.append(f"--{boundary}--".encode())
    body = b"\r\n".join(lines)
    return body, f"multipart/form-data; boundary={boundary}"


def main():
    scratch = tempfile.mkdtemp(prefix="kagaz_smoke_")
    db_path = os.path.join(scratch, "smoke.db")
    upload_dir = os.path.join(scratch, "uploads")

    env = os.environ.copy()
    env.update({
        "DATABASE_URL": f"sqlite:///{db_path}",
        "UPLOAD_DIR": upload_dir,
        "SECRET_KEY": "smoke_test_secret_key_0123456789abcdef",
        "ENV_MODE": "development",
        "ALLOWED_ORIGINS": "http://localhost:3000",
        # AI intentionally unreachable for this test: port 9 refuses instantly,
        # so Ollama (even if installed on this machine) can never answer and
        # Groq is unset → every AI call must fail fast and gracefully.
        "OLLAMA_BASE_URL": "http://127.0.0.1:9",
        "GROQ_API_KEY": "",
    })

    port = 8765
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1",
         "--port", str(port), "--log-level", "warning"],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    try:
        # ── 1. Server boots and answers ────────────────────────────────────
        base = f"http://127.0.0.1:{port}"
        up = False
        for _ in range(40):
            try:
                s, _, b = req("GET", f"{base}/health", timeout=3)
                if s == 200:
                    up = True
                    break
            except Exception:
                pass
            time.sleep(0.5)
        check("server boots and /health responds", up)
        if not up:
            print(proc.stdout.read().decode(errors="replace")[-2000:])
            sys.exit(1)

        s, _, b = req("GET", f"{base}/health")
        check("health reports engines correctly with AI down",
              s == 200
              and b["ai_engines"]["ollama"]["reachable"] is False
              and b["ai_engines"]["groq"]["configured"] is False
              and b["ai_engines"]["gemini"]["configured"] is False
              and b["ai_engines"]["frontier"]["configured"] is False,
              str(b.get("ai_engines")))

        # ── 2. Auth flows (right + wrong credentials) ──────────────────────
        email = f"smoke_{uuid.uuid4().hex[:8]}@example.com"
        s, _, b = req("POST", f"{base}/api/v1/auth/signup",
                      body={"email": email, "password": "secret123", "name": "Smoke Teacher"})
        check("signup returns 200 with token", s == 200 and b.get("access_token"), str(b)[:100])
        token = b["access_token"]
        auth = {"Authorization": f"Bearer {token}"}

        s, _, b = req("POST", f"{base}/api/v1/auth/token",
                      body={"email": email, "password": "WRONG-password"})
        check("login with wrong password → 401 (not 500)", s == 401, f"status={s}")

        s, _, b = req("POST", f"{base}/api/v1/auth/token",
                      body={"email": email, "password": "secret123"})
        check("login with right password returns token", s == 200 and b.get("access_token"))

        s, _, b = req("GET", f"{base}/api/v1/auth/me")
        check("protected endpoint without token → 401", s == 401, f"status={s}")

        s, _, b = req("GET", f"{base}/api/v1/auth/me", headers={"Authorization": "Bearer garbage.token.here"})
        check("invalid token → 401 (not 500)", s == 401, f"status={s}")

        s, _, b = req("GET", f"{base}/api/v1/auth/me", headers=auth)
        check("/auth/me returns profile", s == 200 and b.get("email") == email, str(b)[:80])

        # ── 3. Upload validation (the 'file upload fails' paths) ───────────
        jpeg = b"\xff\xd8\xff\xe0" + b"smokejpegbytes" * 100

        body, ctype = build_multipart([multipart_field("file", "test.jpg", jpeg, "image/jpeg")])
        s, _, b = req("POST", f"{base}/api/v1/worksheets/upload",
                      headers={"Authorization": f"Bearer {token}", "Content-Type": ctype}, body=body)
        check("valid JPEG upload → 200 with image_url", s == 200 and b.get("image_url", "").startswith("/uploads/"), str(b)[:100])
        image_url = b.get("image_url", "")

        body, ctype = build_multipart([multipart_field("file", "evil.exe", jpeg, "application/octet-stream")])
        s, _, b = req("POST", f"{base}/api/v1/worksheets/upload",
                      headers={"Authorization": f"Bearer {token}", "Content-Type": ctype}, body=body)
        check("disallowed extension rejected → 4xx", 400 <= s < 500, f"status={s}")

        body, ctype = build_multipart([multipart_field("file", "big.jpg", b"\x00" * (5 * 1024 * 1024 + 100), "image/jpeg")])
        s, _, b = req("POST", f"{base}/api/v1/worksheets/upload",
                      headers={"Authorization": f"Bearer {token}", "Content-Type": ctype}, body=body)
        check("oversized file rejected → 413", s == 413, f"status={s}")

        s, _, b = req("POST", f"{base}/api/v1/worksheets/upload",
                      headers={"Content-Type": "application/json"}, body={"nope": 1})
        check("upload without auth → 401/403", s in (401, 403), f"status={s}")

        # ── 4. Worksheet lifecycle WITH AI DOWN (must degrade gracefully) ──
        s, _, b = req("POST", f"{base}/api/v1/classes",
                      body={"name": "Smoke 5A", "grade": "Grade 5", "subject": "mathematics",
                            "student_names": ["Ravi", "Sita"]}, headers=auth)
        check("create class works", s == 200, str(b)[:100])
        cls = b
        students = {st["name"]: st["id"] for st in cls["students"]}

        s, _, b = req("POST", f"{base}/api/v1/assessments",
                      body={"class_id": cls["id"], "template_key": "math_g2_3_quick"}, headers=auth)
        check("create assessment works", s == 200, str(b)[:100])
        aid = b["id"]

        s, _, b = req("POST", f"{base}/api/v1/assessments/{aid}/scan",
                      body={"student_id": students["Ravi"], "image_url": image_url}, headers=auth)
        check("attach scan → worksheet created", s == 200 and b.get("worksheet_id"), str(b)[:120])
        wid = b["worksheet_id"]

        # AI is down: background OCR must mark the worksheet 'failed', not hang
        deadline = time.time() + 20
        status = "processing"
        while time.time() < deadline:
            s, _, b = req("GET", f"{base}/api/v1/worksheets/{wid}", headers=auth)
            status = b.get("status", "?")
            if status != "processing":
                break
            time.sleep(0.5)
        check("AI down → OCR fails gracefully to 'failed' status (no hang)", status == "failed", f"status={status}")

        s, _, b = req("GET", f"{base}/api/v1/worksheets/{wid}", headers=auth)
        check("failed worksheet still retrievable with error info", s == 200 and b.get("status") == "failed")

        # Class endpoints must not 500 while a scan failed
        s, _, b = req("GET", f"{base}/api/v1/classes/{cls['id']}/map", headers=auth)
        check("class map survives failed OCR (no 500)", s == 200, f"status={s}")

        s, _, b = req("GET", f"{base}/api/v1/classes/{cls['id']}/today", headers=auth)
        check("today endpoint survives failed OCR", s == 200, f"status={s}")

        s, _, b = req("GET", f"{base}/api/v1/students/{students['Ravi']}/profile", headers=auth)
        check("student profile survives failed OCR", s == 200, f"status={s}")

        # ── 5. Ownership isolation ─────────────────────────────────────────
        s, _, b = req("POST", f"{base}/api/v1/auth/signup",
                      body={"email": f"other_{uuid.uuid4().hex[:6]}@example.com",
                            "password": "secret123", "name": "Other Teacher"})
        other = {"Authorization": f"Bearer {b['access_token']}"}

        s, _, b = req("GET", f"{base}/api/v1/worksheets/{wid}", headers=other)
        check("other teacher cannot read worksheet → 404", s == 404, f"status={s}")

        s, _, b = req("GET", f"{base}/api/v1/worksheets/{wid}", headers=auth)
        check("owner can read own worksheet", s == 200)

        # Upload serving: no token → 401; owner → 200
        filename = image_url.split("/")[-1]
        s, _, _ = req("GET", f"{base}/uploads/{filename}")
        check("unauthenticated image access → 401 (PII protected)", s == 401, f"status={s}")
        s, _, _ = req("GET", f"{base}/uploads/{filename}", headers=auth)
        check("owner can fetch uploaded image", s == 200)
        s, _, _ = req("GET", f"{base}/uploads/..%2F..%2F{os.path.basename(db_path)}", headers=auth)
        check("path traversal on uploads blocked → 404", s == 404, f"status={s}")

        # ── 6. Security headers + CORS ─────────────────────────────────────
        s, h, _ = req("GET", f"{base}/health")
        check("security headers present",
              hget(h, "X-Content-Type-Options") == "nosniff" and hget(h, "X-Frame-Options") == "DENY",
              str({k: hget(h, k) for k in ("X-Content-Type-Options", "X-Frame-Options")}))
        s, h, _ = req("OPTIONS", f"{base}/api/v1/auth/token",
                      headers={"Origin": "http://localhost:3000",
                               "Access-Control-Request-Method": "POST"})
        check("CORS preflight allowed for configured origin",
              hget(h, "Access-Control-Allow-Origin") == "http://localhost:3000",
              str(hget(h, "Access-Control-Allow-Origin")))

        # 404 handler returns JSON, not HTML
        s, _, b = req("GET", f"{base}/api/v1/definitely-not-a-route", headers=auth)
        check("unknown API route → 404 JSON", s == 404, f"status={s}")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()
        shutil.rmtree(scratch, ignore_errors=True)

    print(f"\n{'=' * 50}\nRESULT: {PASS} passed, {FAIL} failed")
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
