import json
import logging
from typing import Dict, Any, List

from app.core.config import settings
from app.services.ai_provider import ai_provider

logger = logging.getLogger(__name__)


class LLMService:
    """
    LLM-powered grading & pedagogical analysis on the free/open stack.
    All inference routes through the unified AI provider (Ollama local first,
    Groq free tier fallback). Falls back to rule-based heuristics offline.
    """

    def __init__(self):
        pass

    def _sanitize_prompt_text(self, text: str) -> str:
        """
        Escapes and sanitizes text strings to prevent mangling layout formats or injecting instructions.
        """
        if not text:
            return "N/A"
        # Replace curly braces to prevent prompt template parser disruption
        text = text.replace("{", "[").replace("}", "]")
        return text.strip()

    async def compute_semantic_similarity(self, expected: str, student: str) -> float:
        """
        Semantic Textual Similarity between expected and student answers.
        Uses local open embeddings (Ollama) with a lexical F1 fallback — no paid API.
        """
        return ai_provider.semantic_similarity(expected, student)

    async def evaluate_single_answer(self, question: str, expected: str, student: str) -> Dict[str, Any]:
        """
        Split & Blind Strategy: evaluates a single answer in total isolation to prevent holistic bias.
        Dual-Engine Verification: plays devil's advocate to aggressively verify if the student is functionally correct.
        """
        system_prompt = (
            "You are a strictly unbiased, highly deterministic grader playing devil's advocate. "
            "Your only job is to evaluate if a student's answer is semantically and functionally correct compared to the expected answer. "
            "Ignore minor grammatical errors, spelling mistakes, or regional vocabulary if the core meaning is identical. "
            "Respond ONLY with a JSON object."
        )

        user_prompt = (
            f"Printed Question: {question}\n"
            f"Correct Answer: {expected}\n"
            f"Student Answer: {student}\n\n"
            f"Is the student's answer correct purely by academic criteria? "
            f"If it means exactly the same thing but uses slightly different phrasing or spelling, mark it 'correct'.\n"
            f'Respond with JSON: {{"overridden_grade": "correct" or "incorrect", "reason": "..."}}'
        )

        schema_hint = '{"overridden_grade": "correct", "reason": "brief explanation"}'

        try:
            raw = ai_provider.chat(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                schema_hint=schema_hint,
                temperature=0.0,
            )
            parsed = json.loads(raw) if isinstance(raw, str) else raw
            if isinstance(parsed, dict) and "overridden_grade" in parsed:
                return parsed
            return {"overridden_grade": "incorrect", "reason": "Invalid JSON format"}
        except Exception as e:
            logger.warning(f"[LLM] Error in evaluate_single_answer: {str(e)}")
            return {"overridden_grade": "incorrect", "reason": f"Error: {str(e)}"}

    async def analyze_results(self, student_name: str, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Core entrypoint running LLM evaluation, identifying mistakes, mapping learning gaps,
        generating feedback and remedial tasks. Falls back to rule-based parsing if offline.
        """
        if not ai_provider.check_ollama() and not ai_provider.groq_ready:
            return self._run_local_fallback(student_name, questions)

        # Format questions list for prompt context
        qa_list = []
        for q in questions:
            q_no = self._sanitize_prompt_text(str(q.get("question_no", "?")))
            q_text = self._sanitize_prompt_text(q.get("question_text", "N/A"))
            std_ans = self._sanitize_prompt_text(q.get("student_answer", ""))
            corr_ans = self._sanitize_prompt_text(q.get("correct_answer", "N/A"))
            status = self._sanitize_prompt_text(q.get("is_correct", "pending"))
            qa_list.append(
                f"Question {q_no}: {q_text}\n"
                f"- Expected Answer: {corr_ans}\n"
                f"- Student Answer: {std_ans}\n"
                f"- Grading: {status}"
            )
        qa_formatted = "\n\n".join(qa_list)

        system_prompt = (
            "You are an expert school teacher and educational psychologist.\n"
            "Your job is to analyze a student's graded worksheet performance, identify conceptual mistakes,\n"
            "diagnose underlying learning gaps, and output encouraging feedback and actionable remedial suggestions.\n"
            "You MUST respond ONLY with a valid JSON object matching the exact structure requested."
        )

        user_prompt = (
            f"Please analyze the worksheet for student: {student_name}.\n\n"
            f"Graded Worksheet Items:\n"
            f"{qa_formatted}\n\n"
            f"Respond ONLY with a JSON object containing the following keys:\n"
            f"1. \"mistakes\": A list of incorrect answers, each item containing:\n"
            f"   - \"question_no\": string representing the question number\n"
            f"   - \"student_answer\": the student's answer\n"
            f"   - \"correct_answer\": the correct answer\n"
            f"   - \"explanation\": brief explanation of the student's mistake\n"
            f"2. \"learning_gaps\": A list of ALL identified conceptual gaps. Be thorough and include every distinct gap (e.g., both \"Addition With Carrying\" and \"Subtraction With Borrowing\" if applicable), each item containing:\n"
            f"   - \"concept\": Name of the concept (e.g. \"Carried Addition\", \"Subtraction Borrowing\")\n"
            f"   - \"description\": Why the student is struggling\n"
            f"3. \"feedback\": Encouraging, positive, and constructive feedback written directly to the student.\n"
            f"4. \"remedial_suggestions\": Actionable activities, exercises, or resources the teacher should provide."
        )

        schema_hint = (
            '{"mistakes": [{"question_no": "1", "student_answer": "...", "correct_answer": "...", "explanation": "..."}], '
            '"learning_gaps": [{"concept": "...", "description": "..."}], '
            '"feedback": "...", "remedial_suggestions": "..."}'
        )

        max_retries = 2
        for attempt in range(max_retries):
            try:
                raw = ai_provider.chat(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    schema_hint=schema_hint,
                    temperature=0.2,
                )
                parsed = json.loads(raw) if isinstance(raw, str) else raw

                # Validate schema matches expected keys
                required = ["mistakes", "learning_gaps", "feedback", "remedial_suggestions"]
                if isinstance(parsed, dict) and all(k in parsed for k in required):
                    # Ground learning gaps in standard NCERT/ASER taxonomies
                    from app.services.pedagogy import align_learning_gap
                    grounded_gaps = []
                    for gap in parsed.get("learning_gaps", []):
                        aligned = align_learning_gap(gap.get("concept", ""), gap.get("description", ""))
                        grounded_gaps.append(aligned)
                    parsed["learning_gaps"] = grounded_gaps
                    return parsed
                else:
                    logger.warning(f"[LLM] Attempt {attempt + 1}: LLM response missing required JSON keys.")
            except Exception as e:
                logger.warning(f"[LLM] Attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    logger.error("[LLM] All attempts failed. Triggering local fallback.")
                    return self._run_local_fallback(student_name, questions)

    # Language codes used across the app → prompt-friendly names
    LANGUAGE_NAMES = {
        "en": "English",
        "hi": "Hindi (हिन्दी)",
        "ta": "Tamil (தமிழ்)",
        "ml": "Malayalam (മലയാളം)",
        "te": "Telugu (తెలుగు)",
        "ur": "Urdu (اردو)",
    }

    async def narrate_today_action(
        self,
        action: Dict[str, Any],
        snapshot: Dict[str, Any],
        groups: List[Dict[str, Any]],
        class_name: str,
        language: Optional[str] = None,
        timeout: float = 40,
    ) -> Optional[Dict[str, Any]]:
        """
        AI insight narration — turns the DETERMINISTIC evidence engine's output
        (groups, tiers, patterns, snapshot) into a teacher-friendly action plan.

        The LLM only narrates; it never invents data. Every number it may state
        is passed in the prompt and the payload carries a grounded flag + a copy
        of the headline fact it is allowed to repeat. Fails soft: returns None
        on any problem so the deterministic plan is always shown.
        """
        if not action:
            return None
        if not ai_provider.frontier_ready and not ai_provider.check_ollama() and not ai_provider.groq_ready:
            return None

        lang_name = self.LANGUAGE_NAMES.get((language or "en").lower(), language or "English")

        def _brief(g: Dict[str, Any]) -> str:
            return (
                f"* {g.get('name')} (tier {g.get('tier')}, {g.get('member_count')} students) — "
                f"focus: {g.get('focus_label')}. Recommended activity: {g.get('recommended_activity')}"
            )

        groups_text = "\n".join(_brief(g) for g in groups[:8])
        primary = action.get("primary_group") or {}
        snapshot_text = (
            f"- Students assessed: {snapshot.get('students_assessed')}/{snapshot.get('students_total')}\n"
            f"- Competencies where students need support: "
            + ", ".join(f"{r.get('label')} ({r.get('count')})" for r in snapshot.get("needs_support_counts", []))
            + f"\n- Ready to advance: {snapshot.get('ready_to_advance')}"
        )
        headline = action.get("headline") or ""
        facts = {
            "primary_group_name": primary.get("name"),
            "primary_member_count": primary.get("member_count"),
            "primary_focus": primary.get("focus_label"),
            "students_assessed": snapshot.get("students_assessed"),
            "students_total": snapshot.get("students_total"),
            "ready_to_advance": snapshot.get("ready_to_advance"),
        }

        system_prompt = (
            "You are a master teacher-coach for primary school teachers in "
            "low-resource classrooms (ASER/NCERT context). You turn learning-"
            "evidence summaries into short, warm, practical coaching notes. "
            "You NEVER invent numbers, student names, or facts not present in "
            "the provided evidence. Respond ONLY with a valid JSON object."
        )
        user_prompt = (
            f"Class: {class_name}. Deterministic learning-evidence summary:\n"
            f"{snapshot_text}\n\nGroups (weakest tier first):\n{groups_text}\n\n"
            f"System-chosen primary group: {primary.get('name')} "
            f"(focus: {primary.get('focus_label')}).\n"
            f"System headline: {headline}\n\n"
            "Write a short coaching note for the teacher BEFORE class. Rules:\n"
            "1. tone: warm, respectful, practical — like a trusted mentor teacher, not an app.\n"
            "2. why_now: 2–3 sentences explaining why this group and skill come first, "
            "grounded ONLY in the evidence above.\n"
            "3. watch_fors: exactly 3 common student misconceptions to watch for during the "
            "activity, each tied to the focus skill.\n"
            "4. say_this: ONE exact sentence the teacher can say to the primary group, in "
            f"{lang_name}.\n"
            "5. Use NO numbers except those present in the evidence above. No student names.\n\n"
            'Respond ONLY with JSON: {"tone": "...", "why_now": "...", '
            '"watch_fors": ["...", "...", "..."], "say_this": "..."}'
        )
        schema_hint = (
            '{"tone": "...", "why_now": "2-3 sentences", '
            '"watch_fors": ["...", "...", "..."], "say_this": "one sentence"}'
        )

        try:
            raw = ai_provider.chat(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                schema_hint=schema_hint,
                temperature=0.5,
                timeout=timeout,  # the real budget — a sync httpx call cannot be interrupted by asyncio.wait_for
            )
            parsed = json.loads(raw) if isinstance(raw, str) else raw
            if not isinstance(parsed, dict):
                return None
            watch_fors = parsed.get("watch_fors")
            if not isinstance(watch_fors, list):
                watch_fors = []
            watch_fors = [str(w).strip() for w in watch_fors if str(w or "").strip()][:3]
            why_now = str(parsed.get("why_now") or "").strip()
            say_this = str(parsed.get("say_this") or "").strip()
            if not why_now or not watch_fors:
                logger.warning("[LLM] Narration missing required fields — skipping.")
                return None
            return {
                "ai_generated": True,
                "engine": ai_provider.last_engine,  # transparency: which model answered
                "tone": str(parsed.get("tone") or "coach").strip()[:80],
                "why_now": why_now[:600],
                "watch_fors": [w[:200] for w in watch_fors],
                "say_this": say_this[:300],
                "grounded": facts,
                "disclaimer": (
                    "AI coaching note generated from your class evidence — the groups, "
                    "tiers and counts come from the deterministic evidence engine."
                ),
            }
        except Exception as e:
            logger.warning(f"[LLM] Narration failed — deterministic plan remains: {e}")
            return None

    async def generate_quick_check_questions(
        self,
        competency_id: str,
        competency_label: str,
        competency_description: str,
        grade: Optional[str] = None,
        language: Optional[str] = None,
        verify_question: str = "",
        count: int = 4,
    ) -> Optional[List[Dict[str, Any]]]:
        """
        ACT → REASSESS: AI-generates a fresh quick-check for one learning gap.

        Returns validated questions [{number, text, correct_answer, competencies}]
        or None when no AI engine is available / output is unusable — callers fall
        back to the static intervention library so the loop never breaks offline.
        """
        if not competency_id:
            return None
        if not ai_provider.frontier_ready and not ai_provider.check_ollama() and not ai_provider.groq_ready:
            return None

        lang_name = self.LANGUAGE_NAMES.get((language or "en").lower(), language or "English")
        grade_line = f"\n- Class level: {grade}." if grade else ""
        verify_line = f"\n- The teacher's known verification prompt for this gap: {verify_question}" if verify_question else ""

        system_prompt = (
            "You are an expert primary-school teacher and assessment designer "
            "working in low-resource classrooms (ASER/NCERT foundational learning). "
            "You write short oral/written quick-check questions that isolate ONE "
            "foundational competency. Respond ONLY with a valid JSON object."
        )
        user_prompt = (
            f"Create exactly {count} quick-check questions to test whether students "
            f"have overcome this specific learning gap:\n"
            f"- Competency: {competency_label} ({competency_id})\n"
            f"- What it means: {competency_description}{grade_line}{verify_line}\n\n"
            f"Rules:\n"
            f"1. Difficulty must ramp from easiest to hardest across the questions.\n"
            f"2. For math: each question_text MUST be a single plain expression like "
            f"\"42 - 17\" or \"27 + 15\" (numerals with spaces around the operator) — "
            f"no word problems, no multiple choice, no multi-part questions.\n"
            f"3. For literacy: one short word/sentence to read or write — no pictures.\n"
            f"4. correct_answer must be the exact expected response (e.g. \"25\").\n"
            f"5. Write any instructions inside question text in {lang_name} if the "
            f"question is not purely a numeric expression.\n"
            f"6. Do not number the questions — numbering is added automatically.\n"
            f"7. Choose numbers that actually REQUIRE the target skill (e.g. for "
            f"subtraction with regrouping the ones digit of the first number must "
            f"be smaller than the second, like 42 - 17 — never 25 - 12).\n\n"
            f'Respond ONLY with JSON: {{"questions": [{{"text": "...", '
            f'"correct_answer": "..."}}]}}'
        )
        schema_hint = '{"questions": [{"text": "42 - 17", "correct_answer": "25"}]}'

        def _call() -> List[Dict[str, Any]]:
            """One generation round; returns validated questions (may be empty)."""
            raw = ai_provider.chat(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                schema_hint=schema_hint,
                temperature=0.4,
            )
            parsed = json.loads(raw) if isinstance(raw, str) else raw
            if isinstance(parsed, dict):
                raw_questions = parsed.get("questions")
            else:
                raw_questions = parsed  # tolerate a bare array
            if not isinstance(raw_questions, list):
                return []

            # Validate: cap count, drop empties
            validated: List[Dict[str, Any]] = []
            for q in raw_questions[:count]:
                if not isinstance(q, dict):
                    continue
                text = str(q.get("text") or "").strip()
                answer = str(q.get("correct_answer") or "").strip()
                if not text or not answer:
                    continue
                validated.append({"text": text, "correct_answer": answer})
            return validated

        try:
            # Frontier models return all `count` in one round; small local models
            # often emit one question per round — accumulate across a few rounds
            # (deduped) instead of accepting a single-question quick-check.
            collected: List[Dict[str, Any]] = []
            seen: set = set()
            for attempt in range(3):
                for q in _call():
                    key = (q["text"].lower(), q["correct_answer"].lower())
                    if key not in seen:
                        seen.add(key)
                        collected.append(q)
                if len(collected) >= count:
                    break
            if not collected:
                logger.warning("[LLM] Question generation returned no usable questions.")
                return None
            collected = collected[:count]
            return [
                {
                    "number": str(i + 1),
                    "text": q["text"],
                    "correct_answer": q["correct_answer"],
                    "competencies": [competency_id],
                    "engine": ai_provider.last_engine,  # transparency
                }
                for i, q in enumerate(collected)
            ]
        except Exception as e:
            logger.warning(f"[LLM] Question generation failed, library fallback: {e}")
            return None

    def _run_local_fallback(self, student_name: str, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Rules-based heuristics fallback grading and remediation engine.
        Ensures zero dependency failures if offline or engines are unconfigured.
        """
        mistakes = []
        learning_gaps = []

        # Identify incorrect questions based on status
        for q in questions:
            is_corr = q.get("is_correct", "pending")
            if is_corr == "incorrect" or is_corr is False:
                q_no = q.get("question_no", "?")
                std_ans = q.get("student_answer", "")
                corr_ans = q.get("correct_answer", "")
                q_text = q.get("question_text", "N/A")

                mistakes.append({
                    "question_no": q_no,
                    "student_answer": std_ans,
                    "correct_answer": corr_ans,
                    "explanation": f"Student answered '{std_ans}' instead of expected '{corr_ans}' for: {q_text}."
                })

        # Heuristic concept mapping aligned to standard taxonomy
        if mistakes:
            from app.services.pedagogy import align_learning_gap
            # Look for typical math operations from question text
            inferred_concept = "Topic Review Required"
            inferred_desc = f"Student struggled with incorrect question numbers: {', '.join(m['question_no'] for m in mistakes)}."

            # Simple keyword matching on question texts to infer concept
            all_q_text = " ".join(q.get("question_text", "").lower() for q in questions)
            if "sub" in all_q_text or "-" in all_q_text:
                if "borrow" in all_q_text or "regroup" in all_q_text:
                    inferred_concept = "Subtraction With Borrowing"
                else:
                    inferred_concept = "Subtraction"
            elif "add" in all_q_text or "+" in all_q_text:
                if "carry" in all_q_text or "regroup" in all_q_text:
                    inferred_concept = "Addition With Carrying"
                else:
                    inferred_concept = "Addition"

            aligned = align_learning_gap(inferred_concept, inferred_desc)
            learning_gaps.append(aligned)

            feedback = f"Hi {student_name}, you did a good job attempting this worksheet. Let's practice the incorrect questions together to master these concepts!"
            remedial_suggestions = f"Standard Activity: {aligned['standard_remedial_activity']}"
        else:
            feedback = f"Fantastic work, {student_name}! You scored 100% on this worksheet. Keep up the brilliant performance!"
            remedial_suggestions = "No immediate remedial gaps detected. Provide advanced challenge questions or extension activities to maintain momentum."

        return {
            "mistakes": mistakes,
            "learning_gaps": learning_gaps,
            "feedback": feedback,
            "remedial_suggestions": remedial_suggestions,
            "fallback_warning": "Local heuristics fallback was triggered due to LLM service disruption."
        }


llm_service = LLMService()
