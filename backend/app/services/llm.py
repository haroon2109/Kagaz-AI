import json
import re
from typing import Dict, Any, List
from app.core.config import settings

class LLMService:
  def __init__(self):
    self.client = None
    self._init_client()

  def _init_client(self):
    """
    Initializes the OpenAI-compatible client if the API key is configured.
    """
    if settings.LLAMA_API_KEY:
      try:
        from openai import OpenAI
        self.client = OpenAI(
          base_url=settings.LLAMA_API_BASE,
          api_key=settings.LLAMA_API_KEY
        )
      except Exception as e:
        print(f"[LLM] Warning: Failed to import/initialize OpenAI client: {str(e)}")
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

  def analyze_results(self, student_name: str, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Core entrypoint running Llama evaluation, identifying mistakes, mapping learning gaps,
    generating feedback and remedial tasks. Falls back to rule-based parsing if offline.
    """
    self._init_client()

    if not self.client:
      return self._run_local_fallback(student_name, questions)

    # Format questions list for prompt context
    qa_list = []
    for q in questions:
      q_no = q.get("question_no", "?")
      q_text = q.get("question_text", "N/A")
      std_ans = q.get("student_answer", "")
      corr_ans = q.get("correct_answer", "N/A")
      status = q.get("is_correct", "pending")
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

    try:
      response = self.client.chat.completions.create(
        model=settings.LLAMA_MODEL,
        messages=[
          {"role": "system", "content": system_prompt},
          {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.2
      )
      
      raw_content = response.choices[0].message.content
      cleaned = self._clean_json_string(raw_content)
      parsed = json.loads(cleaned)
      
      # Validate schema matches expected keys
      required = ["mistakes", "learning_gaps", "feedback", "remedial_suggestions"]
      if all(k in parsed for k in required):
        return parsed
      else:
        print("[LLM] Warning: LLM response missing required JSON keys. Triggering fallback.")
        return self._run_local_fallback(student_name, questions)

    except Exception as e:
      print(f"[LLM] Error calling Llama API: {str(e)}. Triggering local fallback.")
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
      if is_corr == "incorrect" or is_corr == "incorrect" or is_corr is False:
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

    # Heuristic concept mapping
    if mistakes:
      learning_gaps.append({
        "concept": "Topic Review Required",
        "description": f"The student struggled with {len(mistakes)} items on the worksheet. Specifically, review incorrect question numbers: {', '.join(m['question_no'] for m in mistakes)}."
      })
      feedback = f"Hi {student_name}, you did a good job attempting this worksheet. Let's practice the incorrect questions together to master these concepts!"
      remedial_suggestions = "Review the incorrect worksheet responses during class. Assign targeted worksheets covering these specific problem items."
    else:
      feedback = f"Fantastic work, {student_name}! You scored 100% on this worksheet. Keep up the brilliant performance!"
      remedial_suggestions = "No immediate remedial gaps detected. Provide advanced challenge questions or extension activities to maintain momentum."

    return {
      "mistakes": mistakes,
      "learning_gaps": learning_gaps,
      "feedback": feedback,
      "remedial_suggestions": remedial_suggestions
    }

llm_service = LLMService()
