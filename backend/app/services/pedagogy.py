import re
from typing import Dict, Any, List

# Standard NCERT / ASER Learning Outcomes taxonomy mapping
PEDAGOGICAL_TAXONOMY = {
  # Mathematics Competencies (ASER / NCERT Grade 1-5)
  "MATH_ADD_SIMPLE": {
    "standard_id": "M-1.1",
    "framework": "ASER (Grade 1/2) & NCERT M-102",
    "concept": "Addition Without Carrying",
    "description": "Adding single-digit or double-digit numbers where sum of digits does not exceed 9.",
    "standard_remedial": "Use visual concrete counters (beads, pebbles) or draw vertical lines to represent and combine counts."
  },
  "MATH_ADD_CARRY": {
    "standard_id": "M-2.1",
    "framework": "ASER (Grade 2/3) & NCERT M-202",
    "concept": "Addition With Carrying",
    "description": "Adding numbers where column sum exceeds 9, requiring regrouping to the tens place.",
    "standard_remedial": "Use Place Value Mats with bundles of 10 sticks (Matchsticks) and loose single sticks to visualize regrouping/carrying."
  },
  "MATH_SUB_SIMPLE": {
    "standard_id": "M-2.2",
    "framework": "ASER (Grade 2) & NCERT M-203",
    "concept": "Subtraction Without Borrowing",
    "description": "Subtracting smaller numbers from larger numbers column-by-column without regrouping.",
    "standard_remedial": "Utilize backward counting games or physical subtraction lines to visually cross out taken-away objects."
  },
  "MATH_SUB_BORROW": {
    "standard_id": "M-3.1",
    "framework": "ASER (Grade 3/4) & NCERT M-302",
    "concept": "Subtraction With Borrowing",
    "description": "Regrouping tens to ones when the top digit in a column is smaller than the bottom digit.",
    "standard_remedial": "Conduct base-10 block exercises demonstrating that 1 Ten rod is physically swapped for 10 Unit blocks during borrowing."
  },
  "MATH_PLACE_VALUE": {
    "standard_id": "M-2.3",
    "framework": "NCERT M-201",
    "concept": "Place Value and Face Value",
    "description": "Understanding units, tens, and hundreds positions of digits in numbers up to 999.",
    "standard_remedial": "Use spikes abacus models or arrow cards to deconstruct numbers (e.g. 52 = 50 + 2)."
  },
  "MATH_MULTIPLICATION": {
    "standard_id": "M-3.2",
    "framework": "ASER (Grade 3) & NCERT M-304",
    "concept": "Multiplication Basics",
    "description": "Understanding multiplication as repeated addition and mastering basic tables.",
    "standard_remedial": "Introduce grid arrays using grid paper and skip counting patterns on number tracks."
  },

  # Language / Literacy Competencies (ASER / NCERT Grade 1-5)
  "LANG_LETTER_REC": {
    "standard_id": "L-1.1",
    "framework": "ASER (Grade 1) & NCERT L-101",
    "concept": "Letter and Sound Recognition",
    "description": "Identifying alphabet letters/phonemes and matching them to target sounds.",
    "standard_remedial": "Deploy phonics matching games and sand-tray writing to link letter shapes with sound targets."
  },
  "LANG_WORD_READ": {
    "standard_id": "L-1.2",
    "framework": "ASER (Grade 1/2) & NCERT L-102",
    "concept": "Word Reading and Vocabulary",
    "description": "Blending sounds to read simple 2-3 letter words and associating them with pictures.",
    "standard_remedial": "Build visual flashcards with 3-letter CVC word groups (Consonant-Vowel-Consonant) and picture references."
  },
  "LANG_COMP_SIMPLE": {
    "standard_id": "L-2.1",
    "framework": "ASER (Grade 2/3) & NCERT L-204",
    "concept": "Sentence / Paragraph Comprehension",
    "description": "Reading short paragraphs and answering basic direct factual questions about the text.",
    "standard_remedial": "Read simple 4-line stories aloud, followed by immediate 'who, what, where' comprehension card questions."
  }
}

def align_learning_gap(raw_concept: str, raw_description: str) -> Dict[str, Any]:
  """
  Analyzes raw diagnostic output strings from the LLM, matches them against
  the standardized ASER/NCERT competencies, and returns a grounded result.
  """
  raw_concept_lower = raw_concept.lower()
  raw_desc_lower = raw_description.lower()
  
  # Rule-based matching heuristics based on keyword matching
  matched_key = None
  
  if "borrow" in raw_concept_lower or "borrow" in raw_desc_lower or "regroup" in raw_concept_lower and "sub" in raw_concept_lower:
    matched_key = "MATH_SUB_BORROW"
  elif "carry" in raw_concept_lower or "carry" in raw_desc_lower or "regroup" in raw_concept_lower and "add" in raw_concept_lower:
    matched_key = "MATH_ADD_CARRY"
  elif "place value" in raw_concept_lower or "face value" in raw_concept_lower or "tens" in raw_concept_lower or "ones" in raw_concept_lower:
    matched_key = "MATH_PLACE_VALUE"
  elif "add" in raw_concept_lower or "addition" in raw_concept_lower:
    matched_key = "MATH_ADD_SIMPLE"
  elif "sub" in raw_concept_lower or "subtraction" in raw_concept_lower:
    matched_key = "MATH_SUB_SIMPLE"
  elif "mult" in raw_concept_lower or "product" in raw_concept_lower or "times" in raw_concept_lower:
    matched_key = "MATH_MULTIPLICATION"
  elif "letter" in raw_concept_lower or "alphabet" in raw_concept_lower:
    matched_key = "LANG_LETTER_REC"
  elif "word" in raw_concept_lower or "vocabulary" in raw_concept_lower:
    matched_key = "LANG_WORD_READ"
  elif "comprehend" in raw_concept_lower or "read" in raw_concept_lower or "story" in raw_concept_lower:
    matched_key = "LANG_COMP_SIMPLE"

  if matched_key:
    taxonomy = PEDAGOGICAL_TAXONOMY[matched_key]
    return {
      "concept": taxonomy["concept"],
      "description": raw_description,
      "competency_framework": taxonomy["framework"],
      "standard_id": taxonomy["standard_id"],
      "standard_remedial_activity": taxonomy["standard_remedial"]
    }
  else:
    # Safe generic fallback to prevent dropping custom LLM findings
    return {
      "concept": raw_concept,
      "description": raw_description,
      "competency_framework": "NCERT General Framework",
      "standard_id": "GEN-01",
      "standard_remedial_activity": "Design step-by-step peer-assisted learning tasks targeting this specific skill area."
    }
