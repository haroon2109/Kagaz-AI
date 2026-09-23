"""
Kagaz AI — Structured pedagogy framework.

Everything pedagogical lives here as structured data so the pipeline is
framework-driven rather than hard-coded UI text or free-form LLM invention:

  COMPETENCIES          competency definitions per subject (FLN aligned)
  SUBTREE               prerequisite parents for conservative evidence roll-up
  TIERS                 learning-level groups + which competencies gate promotion
  ASSESSMENT_TEMPLATES  short, printable, low-ink quick assessments
  INTERVENTION_LIBRARY  10-minute, low-TLM remediation activities
  VERIFY_QUESTIONS      quick 1:1 verification questions for thin evidence

Kagaz does not invent pedagogy with an LLM — the LLM only helps read messy
handwriting and phrase teacher-friendly explanations. Decisions come from here.
"""

from typing import Any, Dict, List, Optional

# ─────────────────────────────────────────────────────────────────────────────
# Competency model
# ─────────────────────────────────────────────────────────────────────────────

COMPETENCIES: Dict[str, Dict[str, Any]] = {
    # ── Mathematics ──────────────────────────────────────────────────────────
    "MATH_NUM_RECOG": {
        "id": "MATH_NUM_RECOG",
        "subject": "mathematics",
        "label": "Number recognition",
        "description": "Reads and writes numbers up to 2–3 digits.",
        "tier": 0,
        "verify_question": "Point to 3 different 2-digit numbers. Can the child read each one aloud?",
    },
    "MATH_PLACE_VALUE": {
        "id": "MATH_PLACE_VALUE",
        "subject": "mathematics",
        "label": "Place value",
        "description": "Understands tens and ones in 2-digit numbers (42 = 4 tens + 2 ones).",
        "tier": 1,
        "verify_question": "If you have 4 tens and 2 ones, can the child build 42 with bundles?",
    },
    "MATH_COMPARE": {
        "id": "MATH_COMPARE",
        "subject": "mathematics",
        "label": "Number comparison",
        "description": "Compares 2-digit numbers using bigger/smaller.",
        "tier": 1,
        "verify_question": "Show two cards: 47 and 74. Can the child tell which is bigger and say why?",
    },
    "MATH_ADD_NO_REGROUP": {
        "id": "MATH_ADD_NO_REGROUP",
        "subject": "mathematics",
        "label": "Addition (no regrouping)",
        "description": "Adds 2-digit numbers without regrouping.",
        "tier": 2,
        "verify_question": "23 + 14 with counters — can the child combine tens and ones correctly?",
    },
    "MATH_ADD_REGROUP": {
        "id": "MATH_ADD_REGROUP",
        "subject": "mathematics",
        "label": "Addition with regrouping",
        "description": "Adds 2-digit numbers where ones exceed 9 (carrying).",
        "tier": 3,
        "verify_question": "27 + 15 with bundles — when there are 12 ones, what does the child do?",
    },
    "MATH_SUB_NO_REGROUP": {
        "id": "MATH_SUB_NO_REGROUP",
        "subject": "mathematics",
        "label": "Subtraction (no regrouping)",
        "description": "Subtracts 2-digit numbers without regrouping.",
        "tier": 2,
        "verify_question": "45 − 21 with counters — can the child take away tens then ones correctly?",
    },
    "MATH_SUB_REGROUP": {
        "id": "MATH_SUB_REGROUP",
        "subject": "mathematics",
        "label": "Subtraction with regrouping",
        "description": "Subtracts where the ones digit of the top number is smaller (borrowing/exchange).",
        "tier": 3,
        "verify_question": "If you have 4 tens and 2 ones, can you take away 7 ones? What does the child do?",
    },
    "MATH_MULTIPLY": {
        "id": "MATH_MULTIPLY",
        "subject": "mathematics",
        "label": "Multiplication basics",
        "description": "Multiplication as repeated addition; tables up to 10.",
        "tier": 4,
        "verify_question": "Show 3 groups of 4 bottle caps. Does the child count all, skip-count, or multiply?",
    },
    # ── Literacy ─────────────────────────────────────────────────────────────
    "LANG_LETTER_REC": {
        "id": "LANG_LETTER_REC",
        "subject": "literacy",
        "label": "Letter recognition",
        "description": "Identifies common letters (capital and small).",
        "tier": 0,
        "verify_question": "Show 5 letter flashcards. How many can the child name in 10 seconds?",
    },
    "LANG_LETTER_SOUND": {
        "id": "LANG_LETTER_SOUND",
        "subject": "literacy",
        "label": "Letter-sound relationship",
        "description": "Gives the common sound of a letter.",
        "tier": 0,
        "verify_question": "Point to 'b'. Does the child say the sound, the letter name, or neither?",
    },
    "LANG_WORD_DECODE": {
        "id": "LANG_WORD_DECODE",
        "subject": "literacy",
        "label": "Word decoding",
        "description": "Blends letters to read simple familiar words.",
        "tier": 1,
        "verify_question": "Show 5 simple word cards (cat, sun, bag). How many can the child read?",
    },
    "LANG_SENTENCE_READ": {
        "id": "LANG_SENTENCE_READ",
        "subject": "literacy",
        "label": "Sentence reading",
        "description": "Reads simple short sentences.",
        "tier": 2,
        "verify_question": "Can the child read 'The sun is hot.' without stopping at every word?",
    },
    "LANG_FLUENCY": {
        "id": "LANG_FLUENCY",
        "subject": "literacy",
        "label": "Reading fluency",
        "description": "Reads a short paragraph smoothly with few hesitations.",
        "tier": 3,
        "verify_question": "Ask the child to read a 4-line passage aloud. Note hesitations and repeats.",
    },
    "LANG_COMPREHENSION": {
        "id": "LANG_COMPREHENSION",
        "subject": "literacy",
        "label": "Basic comprehension",
        "description": "Answers simple who/what/where questions about a heard or read text.",
        "tier": 4,
        "verify_question": "After the story, ask: 'Who was the boy?' 'What did he lose?'",
    },
}

# Prerequisite subtrees: evidence against a child rolls up to these parents
# conservatively (used only when the direct evidence is thin, never to claim
# certainty from a single error).
SUBTREE: Dict[str, List[str]] = {
    "MATH_ADD_REGROUP": ["MATH_ADD_NO_REGROUP", "MATH_PLACE_VALUE"],
    "MATH_SUB_REGROUP": ["MATH_SUB_NO_REGROUP", "MATH_PLACE_VALUE"],
    "MATH_ADD_NO_REGROUP": ["MATH_NUM_RECOG"],
    "MATH_SUB_NO_REGROUP": ["MATH_NUM_RECOG", "MATH_PLACE_VALUE"],
    "MATH_MULTIPLY": ["MATH_ADD_NO_REGROUP"],
    "MATH_COMPARE": ["MATH_NUM_RECOG"],
    "LANG_SENTENCE_READ": ["LANG_WORD_DECODE", "LANG_LETTER_REC"],
    "LANG_FLUENCY": ["LANG_SENTENCE_READ"],
    "LANG_COMPREHENSION": ["LANG_SENTENCE_READ"],
    "LANG_WORD_DECODE": ["LANG_LETTER_SOUND", "LANG_LETTER_REC"],
}

VERIFY_QUESTIONS: Dict[str, str] = {
    cid: c["verify_question"]
    for cid, c in COMPETENCIES.items()
    if c.get("verify_question")
}

# ─────────────────────────────────────────────────────────────────────────────
# Learning-level tiers (TaRL-inspired learning groups, framework-configurable)
# ─────────────────────────────────────────────────────────────────────────────

TIERS: Dict[str, Dict[str, Any]] = {
    "0": {
        "label": "Foundations",
        "group_name": "Group A",
        "description": "Building number/letter foundations",
        "requires": ["MATH_NUM_RECOG"],
        "activity": "Concrete/oral foundational activity",
    },
    "1": {
        "label": "Early operations",
        "group_name": "Group B",
        "description": "Working on basic operations and decoding",
        "requires": ["MATH_NUM_RECOG", "MATH_PLACE_VALUE"],
        "activity": "Guided practice with counters",
    },
    "2": {
        "label": "Application",
        "group_name": "Group C",
        "description": "Applying operations without regrouping",
        "requires": ["MATH_NUM_RECOG", "MATH_PLACE_VALUE", "MATH_ADD_NO_REGROUP", "MATH_SUB_NO_REGROUP"],
        "activity": "Independent practice / application tasks",
    },
    "3": {
        "label": "Ready to advance",
        "group_name": "Group D",
        "description": "Ready for regrouping and multi-digit work",
        "requires": ["MATH_NUM_RECOG", "MATH_PLACE_VALUE", "MATH_ADD_NO_REGROUP", "MATH_SUB_NO_REGROUP", "MATH_ADD_REGROUP", "MATH_SUB_REGROUP"],
        "requires_demonstrated": ["MATH_SUB_REGROUP"],
        "activity": "Regrouping practice with bundles",
    },
    "4": {
        "label": "Extension",
        "group_name": "Group E",
        "description": "Ready for multiplication and multi-step problems",
        "requires": [
            "MATH_NUM_RECOG", "MATH_PLACE_VALUE", "MATH_ADD_NO_REGROUP",
            "MATH_SUB_NO_REGROUP", "MATH_ADD_REGROUP", "MATH_SUB_REGROUP",
        ],
        "requires_demonstrated": ["MATH_SUB_REGROUP"],
        "activity": "Extension tasks (multiplication, multi-step problems)",
    },
}

TIER_ORDER: List[str] = ["0", "1", "2", "3", "4"]

# ─────────────────────────────────────────────────────────────────────────────
# Quick assessment templates — short, printable, low-ink, competency-focused
# ─────────────────────────────────────────────────────────────────────────────

ASSESSMENT_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "math_g2_3_quick": {
        "key": "math_g2_3_quick",
        "subject": "mathematics",
        "grades": ["2", "3"],
        "title": "Quick Math Check — Grade 2–3",
        "description": "7 questions • about 10 minutes • 1 page, low ink",
        "printable": [
            "Name: ______________    Roll: ______",
            "",
            "Q1. Read these numbers aloud:   17    42    85",
            "Q2. Circle the BIGGER number:   47   or   74",
            "Q3.  23 + 14 = ______",
            "Q4.  45 - 21 = ______",
            "Q5.  42 - 17 = ______",
            "Q6.  53 - 28 = ______",
            "Q7.  47 + 38 = ______",
        ],
        "questions": [
            {
                "number": "1",
                "text": "Read aloud: 17, 42, 85",
                "type": "oral",
                "competencies": ["MATH_NUM_RECOG"],
                "correct_answer": "17, 42, 85",
            },
            {
                "number": "2",
                "text": "Circle the bigger number: 47 or 74",
                "type": "written",
                "competencies": ["MATH_COMPARE", "MATH_PLACE_VALUE"],
                "correct_answer": "74",
            },
            {
                "number": "3",
                "text": "23 + 14",
                "type": "written",
                "competencies": ["MATH_ADD_NO_REGROUP"],
                "correct_answer": "37",
            },
            {
                "number": "4",
                "text": "45 - 21",
                "type": "written",
                "competencies": ["MATH_SUB_NO_REGROUP"],
                "correct_answer": "24",
            },
            {
                "number": "5",
                "text": "42 - 17",
                "type": "written",
                "competencies": ["MATH_SUB_REGROUP", "MATH_PLACE_VALUE"],
                "correct_answer": "25",
            },
            {
                "number": "6",
                "text": "53 - 28",
                "type": "written",
                "competencies": ["MATH_SUB_REGROUP", "MATH_PLACE_VALUE"],
                "correct_answer": "25",
            },
            {
                "number": "7",
                "text": "47 + 38",
                "type": "written",
                "competencies": ["MATH_ADD_REGROUP", "MATH_PLACE_VALUE"],
                "correct_answer": "85",
            },
        ],
    },
    "math_g1_quick": {
        "key": "math_g1_quick",
        "subject": "mathematics",
        "grades": ["1"],
        "title": "Quick Math Check — Grade 1",
        "description": "5 questions • about 8 minutes • 1 page, low ink",
        "printable": [
            "Name: ______________    Roll: ______",
            "",
            "Q1. Read these numbers aloud:   3    9    12    20",
            "Q2.  4 + 3 = ______",
            "Q3.  7 - 2 = ______",
            "Q4.  12 + 5 = ______",
            "Q5.  15 - 4 = ______",
        ],
        "questions": [
            {
                "number": "1",
                "text": "Read aloud: 3, 9, 12, 20",
                "type": "oral",
                "competencies": ["MATH_NUM_RECOG"],
                "correct_answer": "3, 9, 12, 20",
            },
            {"number": "2", "text": "4 + 3", "type": "written", "competencies": ["MATH_ADD_NO_REGROUP"], "correct_answer": "7"},
            {"number": "3", "text": "7 - 2", "type": "written", "competencies": ["MATH_SUB_NO_REGROUP"], "correct_answer": "5"},
            {"number": "4", "text": "12 + 5", "type": "written", "competencies": ["MATH_ADD_NO_REGROUP"], "correct_answer": "17"},
            {"number": "5", "text": "15 - 4", "type": "written", "competencies": ["MATH_SUB_NO_REGROUP"], "correct_answer": "11"},
        ],
    },
    "literacy_g1_2_quick": {
        "key": "literacy_g1_2_quick",
        "subject": "literacy",
        "grades": ["1", "2"],
        "title": "Quick Reading Check — Grade 1–2",
        "description": "5 questions • about 10 minutes • 1 page, low ink",
        "printable": [
            "Name: ______________    Roll: ______",
            "",
            "Q1. Teacher shows letters: b  m  s  t  — child says each sound.",
            "Q2. Read these words:  cat   sun   bag   pin   hen",
            "Q3. Read this sentence:  The sun is hot.",
            "Q4. Write these letters:  __  __  __  __",
            "Q5. Copy this word:  hand",
        ],
        "questions": [
            {
                "number": "1",
                "text": "Letter sounds: b m s t",
                "type": "oral",
                "competencies": ["LANG_LETTER_REC", "LANG_LETTER_SOUND"],
                "correct_answer": "b, m, s, t",
            },
            {
                "number": "2",
                "text": "Read words: cat, sun, bag, pin, hen",
                "type": "oral",
                "competencies": ["LANG_WORD_DECODE"],
                "correct_answer": "cat, sun, bag, pin, hen",
            },
            {
                "number": "3",
                "text": "Read sentence: The sun is hot.",
                "type": "oral",
                "competencies": ["LANG_SENTENCE_READ"],
                "correct_answer": "The sun is hot.",
            },
            {
                "number": "4",
                "text": "Write the letters shown",
                "type": "written",
                "competencies": ["LANG_LETTER_REC"],
                "correct_answer": "b m s t",
            },
            {
                "number": "5",
                "text": "Copy the word: hand",
                "type": "written",
                "competencies": ["LANG_WORD_DECODE"],
                "correct_answer": "hand",
            },
        ],
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Intervention library — 10-minute activities using locally available TLMs.
# Low-resource: counters, pebbles, sticks, bottle caps, paper cards, blackboard.
# ─────────────────────────────────────────────────────────────────────────────

INTERVENTION_LIBRARY: Dict[str, Dict[str, Any]] = {
    "MATH_NUM_RECOG": {
        "title": "Number cards warm-up",
        "duration_minutes": "10",
        "goal": "Child reads 2-digit numbers confidently.",
        "materials": ["Paper number cards (0–9)", "Blackboard"],
        "teacher_steps": [
            "Write 5 two-digit numbers on the blackboard (e.g. 17, 42, 85, 30, 66).",
            "Each child picks a card and reads it aloud in turn.",
            "Swap cards and repeat twice.",
            "Finish with a 60-second rapid round.",
        ],
        "guided_practice": ["Read: 24", "Read: 57", "Read: 90"],
        "independent_check": ["Write the number 'forty-two' as digits."],
        "mastery_check": ["Read: 138"],
    },
    "MATH_PLACE_VALUE": {
        "title": "Tens and ones with bundles",
        "duration_minutes": "10",
        "goal": "Child understands a 2-digit number as tens + ones.",
        "materials": ["10 sticks or pebbles per bundle", "Loose sticks", "Notebook"],
        "teacher_steps": [
            "Make one bundle of 10 sticks. Show it: 'This is one ten.'",
            "Show 4 bundles + 2 loose sticks. Ask: 'How many sticks?' (42)",
            "Child builds 25 with bundles. Check.",
            "Child builds 30 with bundles. Ask what happens to the loose sticks.",
            "Quick check: child writes how many tens and ones in 36.",
        ],
        "guided_practice": ["Build 25 with bundles", "Build 30 with bundles"],
        "independent_check": ["How many tens and ones in 36?"],
        "mastery_check": ["Build 47, then write 47 = __ tens + __ ones."],
    },
    "MATH_SUB_REGROUP": {
        "title": "Regrouping with counters (exchange one ten)",
        "duration_minutes": "10",
        "goal": "Child exchanges one ten for ten ones to subtract.",
        "materials": ["20 counters/pebbles (or bundles of sticks)", "Pencil and paper"],
        "teacher_steps": [
            "Show 42 as 4 bundles + 2 loose counters.",
            "Ask: 'Take away 7.' Child sees only 2 loose ones — prompt the exchange.",
            "Exchange one bundle for 10 loose ones. Now take away 7.",
            "Count what is left: 25. Write 42 - 7 = 25 together.",
            "Solve one example together on paper (42 - 17).",
            "Child solves 3 guided problems, then 1 alone.",
        ],
        "guided_practice": ["42 - 17", "53 - 28", "61 - 24"],
        "independent_check": ["34 - 15"],
        "mastery_check": ["72 - 45"],
    },
    "MATH_ADD_REGROUP": {
        "title": "Carrying with bundles",
        "duration_minutes": "10",
        "goal": "Child carries a ten when ones exceed 9.",
        "materials": ["Bundles of 10 sticks", "Loose sticks", "Blackboard"],
        "teacher_steps": [
            "Build 27 (2 bundles + 7 loose). Build 15 next to it.",
            "Combine the loose ones: 7 + 5 = 12. Ask: 'What do we do with 12?'",
            "Exchange 10 loose for 1 bundle. Count all: 42.",
            "Write 27 + 15 = 42 together on the board.",
            "Child solves 2 problems with bundles, then 1 on paper.",
        ],
        "guided_practice": ["27 + 15", "38 + 14"],
        "independent_check": ["46 + 27"],
        "mastery_check": ["58 + 29"],
    },
    "MATH_SUB_NO_REGROUP": {
        "title": "Take-away practice with counters",
        "duration_minutes": "10",
        "goal": "Child subtracts tens and ones without regrouping.",
        "materials": ["Counters or pebbles", "Notebook"],
        "teacher_steps": [
            "Show 45 as 4 bundles + 5 loose. Take away 2 bundles, then 1 loose.",
            "Count what remains: 24. Write 45 - 21 = 24.",
            "Child solves 2 problems with counters.",
            "Child solves 2 problems on paper alone.",
        ],
        "guided_practice": ["45 - 21", "38 - 12"],
        "independent_check": ["67 - 34"],
        "mastery_check": ["89 - 45"],
    },
    "MATH_ADD_NO_REGROUP": {
        "title": "Combine the piles",
        "duration_minutes": "10",
        "goal": "Child adds tens and ones separately, then combines.",
        "materials": ["Counters or pebbles", "Notebook"],
        "teacher_steps": [
            "Make a pile of 23 (2 bundles + 3) and a pile of 14 (1 bundle + 4).",
            "Combine bundles first: 3 tens. Then loose: 7 ones.",
            "Read the answer: 37. Write 23 + 14 = 37.",
            "Child solves 2 problems with counters, then 2 on paper.",
        ],
        "guided_practice": ["23 + 14", "31 + 25"],
        "independent_check": ["42 + 36"],
        "mastery_check": ["54 + 23"],
    },
    "MATH_MULTIPLY": {
        "title": "Groups of things",
        "duration_minutes": "10",
        "goal": "Child sees multiplication as equal groups.",
        "materials": ["Bottle caps or pebbles", "Blackboard"],
        "teacher_steps": [
            "Make 3 groups of 4 caps. Ask: 'How many altogether?'",
            "Child counts all, then skip-counts 4, 8, 12.",
            "Write 3 x 4 = 12. Repeat with 2 groups of 5.",
            "Quick check: child draws 4 groups of 3 and writes the answer.",
        ],
        "guided_practice": ["3 x 4", "2 x 5"],
        "independent_check": ["4 x 3"],
        "mastery_check": ["5 x 3"],
    },
    "LANG_LETTER_REC": {
        "title": "Letter flashcard game",
        "duration_minutes": "10",
        "goal": "Child names common letters quickly.",
        "materials": ["Paper letter flashcards", "Blackboard"],
        "teacher_steps": [
            "Show 6 letter cards one by one; child says each letter.",
            "Play 'find the letter': teacher says a sound, child finds the card.",
            "Child writes 3 letters in the air, then on paper.",
        ],
        "guided_practice": ["Name: b", "Name: m", "Name: s"],
        "independent_check": ["Find the letter 't' among 6 cards."],
        "mastery_check": ["Name all 6 cards in one round."],
    },
    "LANG_LETTER_SOUND": {
        "title": "Sound of the letter",
        "duration_minutes": "10",
        "goal": "Child gives the common sound for letters.",
        "materials": ["Letter flashcards", "Objects/pictures (bat, mat, sun)"],
        "teacher_steps": [
            "Hold up 'b': say the sound 'b-uh', child repeats.",
            "Connect to an object: bat begins with 'b-uh'.",
            "Repeat with m, s, t.",
            "Quick check: child says the sound for 4 random cards.",
        ],
        "guided_practice": ["Sound of b", "Sound of m"],
        "independent_check": ["Sound of s and t"],
        "mastery_check": ["Say sounds for b, m, s, t in sequence."],
    },
    "LANG_WORD_DECODE": {
        "title": "Blend the word",
        "duration_minutes": "10",
        "goal": "Child blends sounds to read short words.",
        "materials": ["Word cards (cat, sun, bag, pin, hen)", "Blackboard"],
        "teacher_steps": [
            "Write 'cat'. Say sounds slowly: c-a-t, then blend: cat.",
            "Child blends 3 word cards with you.",
            "Child reads 2 cards alone.",
            "Quick check: child reads 'pin' and 'hen'.",
        ],
        "guided_practice": ["cat", "sun", "bag"],
        "independent_check": ["pin", "hen"],
        "mastery_check": ["Read 'stop'."],
    },
    "LANG_SENTENCE_READ": {
        "title": "Read the sentence strip",
        "duration_minutes": "10",
        "goal": "Child reads a short sentence smoothly.",
        "materials": ["Sentence strips on paper", "Blackboard"],
        "teacher_steps": [
            "Read 'The sun is hot.' together, finger under each word.",
            "Child reads it alone once.",
            "Child reads a second strip alone.",
            "Quick check: child reads both strips without stopping.",
        ],
        "guided_practice": ["The sun is hot.", "I see a cat."],
        "independent_check": ["The bag is big."],
        "mastery_check": ["Read both strips back-to-back."],
    },
    "LANG_FLUENCY": {
        "title": "Read it again, smoothly",
        "duration_minutes": "10",
        "goal": "Child re-reads a short passage with fewer hesitations.",
        "materials": ["4-line story on paper/blackboard"],
        "teacher_steps": [
            "Teacher reads the 4-line story aloud once.",
            "Child reads it aloud; note hesitations (do not interrupt).",
            "Child reads the same story a second time.",
            "Note: was the second reading smoother?",
        ],
        "guided_practice": ["First read-along"],
        "independent_check": ["Second independent read"],
        "mastery_check": ["Third read with almost no hesitations."],
    },
    "LANG_COMPREHENSION": {
        "title": "Who, what, where",
        "duration_minutes": "10",
        "goal": "Child answers simple questions about a short text.",
        "materials": ["4-line story", "Blackboard"],
        "teacher_steps": [
            "Read the 4-line story aloud (or child reads it).",
            "Ask: 'Who is in the story?' 'What did they do?' 'Where?'",
            "Child answers in own words (any language is fine).",
            "Quick check: one more 'why' question.",
        ],
        "guided_practice": ["Who was in the story?"],
        "independent_check": ["What did the boy lose?"],
        "mastery_check": ["Retell the story in 2 sentences."],
    },
}


def get_competency(competency_id: str) -> Optional[Dict[str, Any]]:
    return COMPETENCIES.get(competency_id)


def competency_label(competency_id: str) -> str:
    comp = COMPETENCIES.get(competency_id)
    return comp["label"] if comp else (competency_id or "General")


def template_questions(template_key: str) -> List[Dict[str, Any]]:
    tpl = ASSESSMENT_TEMPLATES.get(template_key)
    return tpl["questions"] if tpl else []


def intervention_for(competency_id: str) -> Optional[Dict[str, Any]]:
    """Library activity for a competency; falls back up the prerequisite tree."""
    if competency_id in INTERVENTION_LIBRARY:
        act = dict(INTERVENTION_LIBRARY[competency_id])
        act["target_competency"] = competency_id
        return act
    for parent in SUBTREE.get(competency_id, []):
        if parent in INTERVENTION_LIBRARY:
            act = dict(INTERVENTION_LIBRARY[parent])
            act["target_competency"] = parent
            return act
    return None
