# Kagaz AI — 90-Second Demo Script

**Golden rule:** open on the Today page, close on a moved student. Never start with setup.

---

## 0:00–0:15 — The problem, in one sentence

> "A Grade 3 teacher in India has 40 students, no diagnostic tools, and no time.
> She can see *who* is failing — never *why*, and never *what to do next*.
> Kagaz answers all three, from a photo of a worksheet."

*(Show the login page with the logo. Click **Try Demo Class** — the fictional Grade 3 class seeds in seconds.)*

## 0:15–0:40 — ASSESS + UNDERSTAND (the AI moment)

1. Go to **Assess** → upload the sample handwritten sheet (have it pre-selected).
2. While it processes: *"A multimodal model reads the handwriting — every answer,
   every question, extracted with confidence scores. This runs on Gemini
   [or: free local models] with automatic fallback to offline open models."*
3. Show the extracted items. Point at one wrong answer: *"35 minus 53-style
   transposition errors are graded by exact numeric rules — the LLM is never
   allowed to think 35 and 53 are 'similar'."*

## 0:40–1:00 — GROUP + ACT (the pedagogy moment)

1. Open **Groups**: *"Every response maps to a competency in an ASER/NCERT-aligned
   framework. Recurring errors — never one-off mistakes — become gap patterns with
   honest confidence levels. The class auto-groups into tiers."*
2. Open **Today**: *"This is the killer screen. It doesn't show analytics — it shows
   the next 10 minutes of teaching, with locally available materials. The AI coach
   note is generated from that evidence — and it's tagged with exactly which model
   produced it."* ← point at the **engine badge**

## 1:00–1:20 — REASSESS + REGROUP (the closed loop)

1. Open a group → **Generate quick check** → *"Fresh questions, AI-generated for this
   exact gap, in the class's language — the badge shows the engine. No AI? It falls
   back to a built-in activity library, so the loop never breaks offline."*
2. Scan one answer sheet → **Complete reassessment** → *"Students who demonstrated
   the skill move up automatically. Groups update. The loop is closed."*

## 1:20–1:30 — The one-liner to end on

> "Every AI inference is confirmable, editable, and transparent — the pedagogy is
> deterministic and auditable, the AI reads, verifies, generates, and narrates.
> **From student work to the next teaching action.**"

---

## Judge Q&A cheat sheet

**"Why not just GPT-4o everything?"**
→ *"A single hallucinated diagnosis misroutes a real child's learning. Competency
decisions live in a deterministic, auditable engine; AI handles perception
(handwriting), verification, generation, and narration. That's a deliberate
safety architecture, not a limitation."*

**"Where exactly is the AI?"**
→ Five layers, one table: `README.md → "How AI Is Used"`. Every output carries the
engine tag; `/health` exposes the whole chain.

**"Does it work without internet?"**
→ Yes — local Ollama + rule-based fallbacks keep the full loop alive offline.
Cloud keys are a quality upgrade, not a dependency.

**"What about children's data?"**
→ Self-hosted (SQLite + local files, no third-party cloud required), and the demo
class is entirely fictional. Real deployments keep data in the school.

---

## Pre-demo checklist

- [ ] `GEMINI_API_KEY` set in `backend/.env` (OCR quality on stage = everything)
- [ ] `curl localhost:8000/health` → shows engines; screenshot ready as backup
- [ ] Demo class seeded (run once before going on stage)
- [ ] Sample handwritten sheet ready in the file picker
- [ ] Browser zoom at 110%+, notifications silenced
