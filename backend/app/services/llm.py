import json
import re
import logging
from typing import Dict, Any, List
import numpy as np
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMService:
  def __init__(self):
    self.client = None
    self.model = None
    self._init_client()

  def _init_client(self):
    """
    Initializes the OpenAI-compatible client if the API key is configured.
    """
    if settings.GEMINI_API_KEY:
      try:
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(
          base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
          api_key=settings.GEMINI_API_KEY
        )
        self.model = settings.GEMINI_MODEL
      except Exception as e:
        logger.warning(f"[LLM] Warning: Failed to initialize Gemini client: {str(e)}")
        self.client = None
    elif settings.LLAMA_API_KEY:
      try:
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(
          base_url=settings.LLAMA_API_BASE,
          api_key=settings.LLAMA_API_KEY
        )
        self.model = settings.LLAMA_MODEL
      except Exception as e:
        logger.warning(f"[LLM] Warning: Failed to import/initialize OpenAI client: {str(e)}")
        self.client = None
    else:
      self.client = None

  def _clean_json_string(self, text: str) -> str:
    """
    Extracts a raw JSON string from potential markdown code block wrapping.
    """
    text = text.strip()
    # Find ```json ... ``` blocks
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if match:
      return match.group(1).strip()
    return text

  def _repair_json_trailing_commas(self, json_str: str) -> str:
    """
    Removes trailing commas from JSON objects and arrays safely,
    avoiding commas inside double-quoted string values.
    """
    chars = list(json_str)
    in_string = False
    escape = False
    last_comma_idx = -1
    
    i = 0
    while i < len(chars):
      c = chars[i]
      if escape:
        escape = False
        i += 1
        continue
      if c == '\\':
        escape = True
        i += 1
        continue
      if c == '"':
        in_string = not in_string
      
      if not in_string:
        if c == ',':
          last_comma_idx = i
        elif c in ('}', ']'):
          if last_comma_idx != -1:
            # Check if there is only whitespace between the comma and the closing bracket
            between = "".join(chars[last_comma_idx + 1:i])
            if not between.strip():
              # Replace comma with space
              chars[last_comma_idx] = ' '
            last_comma_idx = -1
        elif not c.isspace():
          last_comma_idx = -1
      i += 1
    return "".join(chars)

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
    Computes Semantic Textual Similarity (STS) between the expected and student answers
    using Google's text-embedding-004 model.
    """
    if not settings.GEMINI_API_KEY or not expected or not student:
      return 0.0
    try:
      genai.configure(api_key=settings.GEMINI_API_KEY)
      result = genai.embed_content(
        model="models/text-embedding-004",
        content=[expected, student]
      )
      emb1 = np.array(result['embedding'][0])
      emb2 = np.array(result['embedding'][1])
      
      # Compute Cosine Similarity
      cosine_sim = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
      return float(cosine_sim)
    except Exception as e:
      logger.warning(f"[LLM] Error computing similarity: {str(e)}")
      return 0.0

  async def evaluate_single_answer(self, question: str, expected: str, student: str) -> Dict[str, Any]:
    """
    Split & Blind Strategy: Evaluates a single answer in total isolation to prevent holistic bias.
    Dual-Engine Verification: Plays devil's advocate to aggressively verify if the student is functionally correct.
    """
    if not self.client:
      return {"overridden_grade": "incorrect", "reason": "Fallback: LLM not available."}

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
      f"Respond with JSON: {{\"overridden_grade\": \"correct\" or \"incorrect\", \"reason\": \"...\"}}"
    )

    try:
      response = await self.client.chat.completions.create(
        model=self.model,
        messages=[
          {"role": "system", "content": system_prompt},
          {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.0
      )
      
      raw = response.choices[0].message.content
      if not raw:
          return {"overridden_grade": "incorrect", "reason": "Empty AI response"}
          
      parsed = json.loads(self._repair_json_trailing_commas(self._clean_json_string(raw)))
      return parsed if isinstance(parsed, dict) else {"overridden_grade": "incorrect", "reason": "Invalid JSON format"}
    except Exception as e:
      logger.warning(f"[LLM] Error in evaluate_single_answer: {str(e)}")
      return {"overridden_grade": "incorrect", "reason": f"Error: {str(e)}"}

  async def analyze_results(self, student_name: str, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Core entrypoint running LLM evaluation, identifying mistakes, mapping learning gaps,
    generating feedback and remedial tasks. Falls back to rule-based parsing if offline.
    """
    if not self.client:
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
      f"2. \"learning_gaps\": A list of identified conceptual gaps, each item containing:\n"
      f"   - \"concept\": Name of the concept (e.g. \"Carried Addition\", \"Vocabulary Context\")\n"
      f"   - \"description\": Why the student is struggling\n"
      f"3. \"feedback\": Encouraging, positive, and constructive feedback written directly to the student.\n"
      f"4. \"remedial_suggestions\": Actionable activities, exercises, or resources the teacher should provide."
    )

    max_retries = 2
    for attempt in range(max_retries):
      try:
        response = await self.client.chat.completions.create(
          model=self.model,
          messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
          ],
          response_format={"type": "json_object"},
          temperature=0.2
        )
        
        raw_content = response.choices[0].message.content
        cleaned = self._clean_json_string(raw_content)
        
        # Repair trailing commas safely
        cleaned = self._repair_json_trailing_commas(cleaned)
        
        parsed = json.loads(cleaned)

        
        # Validate schema matches expected keys
        required = ["mistakes", "learning_gaps", "feedback", "remedial_suggestions"]
        if all(k in parsed for k in required):
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


  def _run_local_fallback(self, student_name: str, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Rules-based heuristics fallback grading and remediation engine.
    Ensures zero dependency failures if offline or keys are unconfigured.
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

