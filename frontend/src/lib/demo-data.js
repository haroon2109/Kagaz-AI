/**
 * Kagaz AI — Deterministic Hackathon Demo Data
 *
 * Everything in this file is fictional. No real children's data.
 * The demo never calls a live AI API — all responses are pre-seeded.
 * This data tells a Grade 3 teacher's Challenge 2 story in ~3–5 minutes.
 */

// ── 30 Fictional Students ──────────────────────────────────────────────────
// Distributed across 4 learning tiers to tell a realistic story:
//   6 → foundational number skills
//   9 → addition/subtraction foundations
//   10 → regrouping practice
//   5 → ready to advance

export const DEMO_STUDENTS = [
  // Group A — Foundational number skills (6)
  { id: "s01", name: "Aarav",   tier: "foundational" },
  { id: "s02", name: "Bhavna",  tier: "foundational" },
  { id: "s03", name: "Chirag",  tier: "foundational" },
  { id: "s04", name: "Diya",    tier: "foundational" },
  { id: "s05", name: "Eshan",   tier: "foundational" },
  { id: "s06", name: "Fatima",  tier: "foundational" },

  // Group B — Addition/subtraction foundations (9)
  { id: "s07", name: "Gopal",   tier: "add_sub" },
  { id: "s08", name: "Hina",    tier: "add_sub" },
  { id: "s09", name: "Ishaan",  tier: "add_sub" },
  { id: "s10", name: "Jaya",    tier: "add_sub" },
  { id: "s11", name: "Kabir",   tier: "add_sub" },
  { id: "s12", name: "Lata",    tier: "add_sub" },
  { id: "s13", name: "Mohan",   tier: "add_sub" },
  { id: "s14", name: "Nisha",   tier: "add_sub" },
  { id: "s15", name: "Omkar",   tier: "add_sub" },

  // Group C — Regrouping practice (10)
  { id: "s16", name: "Priya",   tier: "regrouping" },
  { id: "s17", name: "Qadir",   tier: "regrouping" },
  { id: "s18", name: "Rani",    tier: "regrouping" },
  { id: "s19", name: "Sameer",  tier: "regrouping" },
  { id: "s20", name: "Tara",    tier: "regrouping" },
  { id: "s21", name: "Umesh",   tier: "regrouping" },
  { id: "s22", name: "Vidya",   tier: "regrouping" },
  { id: "s23", name: "Wahid",   tier: "regrouping" },
  { id: "s24", name: "Zoya",    tier: "regrouping" },
  { id: "s25", name: "Aditi",   tier: "regrouping" },

  // Group D — Ready to advance (5)
  { id: "s26", name: "Rohit",   tier: "advanced" },
  { id: "s27", name: "Sneha",   tier: "advanced" },
  { id: "s28", name: "Vikram",  tier: "advanced" },
  { id: "s29", name: "Meena",   tier: "advanced" },
  { id: "s30", name: "Arjun",   tier: "advanced" },
];

// ── STEP 1 — SCAN: Simulated OCR extraction ───────────────────────────────
// A "scanned" handwritten assessment with 7 questions.
// We simulate the OCR processing animation, then show extracted answers.
// One deliberate OCR misread that the teacher can "correct".

export const DEMO_ASSESSMENT = {
  title: "Quick Math Check — Grade 2–3",
  subject: "mathematics",
  grade: "Grade 3",
  totalStudents: 30,
  description: "7 questions · about 10 minutes · 1 page, low ink",
};

export const DEMO_QUESTIONS = [
  { number: "1", text: "Read aloud: 17, 42, 85",              type: "oral",    correctAnswer: "17, 42, 85",  competencies: ["MATH_NUM_RECOG"] },
  { number: "2", text: "Circle the bigger number: 47 or 74",  type: "written", correctAnswer: "74",           competencies: ["MATH_COMPARE", "MATH_PLACE_VALUE"] },
  { number: "3", text: "23 + 14 = ?",                         type: "written", correctAnswer: "37",           competencies: ["MATH_ADD_NO_REGROUP"] },
  { number: "4", text: "45 − 21 = ?",                         type: "written", correctAnswer: "24",           competencies: ["MATH_SUB_NO_REGROUP"] },
  { number: "5", text: "42 − 17 = ?",                         type: "written", correctAnswer: "25",           competencies: ["MATH_SUB_REGROUP", "MATH_PLACE_VALUE"] },
  { number: "6", text: "53 − 28 = ?",                         type: "written", correctAnswer: "25",           competencies: ["MATH_SUB_REGROUP", "MATH_PLACE_VALUE"] },
  { number: "7", text: "47 + 38 = ?",                         type: "written", correctAnswer: "85",           competencies: ["MATH_ADD_REGROUP", "MATH_PLACE_VALUE"] },
];

// Simulated per-student OCR'd responses. Each student's answers reflect
// their tier — this is what the "scan" produces deterministically.
// We show a sample of 5 representative students in the scan step.

export const SAMPLE_SCAN_RESULTS = [
  {
    studentId: "s16",
    studentName: "Priya",
    answers: { "1": "17, 42, 85", "2": "74", "3": "37", "4": "24", "5": "35", "6": "35", "7": "85" },
    ocrNote: null, // clean read
  },
  {
    studentId: "s01",
    studentName: "Aarav",
    answers: { "1": "17", "2": "47", "3": "314", "4": "264", "5": "314", "6": "264", "7": "715" },
    ocrNote: null,
  },
  {
    studentId: "s07",
    studentName: "Gopal",
    answers: { "1": "17, 42, 85", "2": "74", "3": "37", "4": "34", "5": "25", "6": "35", "7": "85" },
    ocrNote: "OCR read Q4 as '34' — but teacher confirms it should be '34' (incorrect by student, not an OCR error)",
  },
  {
    studentId: "s26",
    studentName: "Rohit",
    answers: { "1": "17, 42, 85", "2": "74", "3": "37", "4": "24", "5": "25", "6": "25", "7": "85" },
    ocrNote: null,
  },
  {
    studentId: "s19",
    studentName: "Sameer",
    answers: { "1": "17, 42, 85", "2": "47", "3": "37", "4": "24", "5": "25", "6": "35", "7": "75" },
    ocrNote: "OCR misread Q7 as '75' — teacher corrects to '75' (student error, not OCR)",
  },
];

// The "OCR misread" that the teacher corrects — this is the human-in-the-loop moment.
export const OCR_CORRECTION = {
  studentName: "Sameer",
  questionNo: "7",
  originalRead: "85",     // what OCR thought it saw
  correctedTo: "75",      // what the teacher sees on the paper
  note: "Sameer's 8 looked like a 7 — the teacher corrects the extraction.",
};

// ── STEP 2 — UNDERSTAND: Deterministic competency analysis ─────────────────
// Per-student competency mapping derived from the answers above.

export const COMPETENCY_LABELS = {
  MATH_NUM_RECOG: "Number recognition",
  MATH_PLACE_VALUE: "Place value",
  MATH_COMPARE: "Number comparison",
  MATH_ADD_NO_REGROUP: "Addition (no regrouping)",
  MATH_ADD_REGROUP: "Addition with regrouping",
  MATH_SUB_NO_REGROUP: "Subtraction (no regrouping)",
  MATH_SUB_REGROUP: "Subtraction with regrouping",
};

// Aggregate class-level competency status (what the "Understand" step shows)
export const CLASS_COMPETENCY_SUMMARY = [
  { id: "MATH_NUM_RECOG",     label: "Number recognition",           demonstrated: 22, developing: 4, needsSupport: 4 },
  { id: "MATH_COMPARE",       label: "Number comparison",            demonstrated: 19, developing: 6, needsSupport: 5 },
  { id: "MATH_ADD_NO_REGROUP",label: "Addition (no regrouping)",     demonstrated: 20, developing: 5, needsSupport: 5 },
  { id: "MATH_SUB_NO_REGROUP",label: "Subtraction (no regrouping)",  demonstrated: 21, developing: 4, needsSupport: 5 },
  { id: "MATH_PLACE_VALUE",   label: "Place value",                  demonstrated: 14, developing: 8, needsSupport: 8 },
  { id: "MATH_SUB_REGROUP",   label: "Subtraction with regrouping",  demonstrated: 8,  developing: 10, needsSupport: 12 },
  { id: "MATH_ADD_REGROUP",   label: "Addition with regrouping",     demonstrated: 7,  developing: 11, needsSupport: 12 },
];

// Observable error patterns (not psychological overclaims)
export const ERROR_PATTERNS = [
  {
    pattern: "Borrow/exchange confusion in subtraction",
    description: "When the ones digit of the top number is smaller than the bottom (e.g. 42 − 17), 12 students subtracted 7 − 2 = 5 instead of exchanging a ten for ten ones.",
    affectedCount: 12,
    affectedPercent: 40,
    evidence: [
      "Q5: 42 − 17 → wrote 35 (subtracted 2 from 7, not borrowing)",
      "Q6: 53 − 28 → wrote 35 (same pattern: 8 − 3 = 5 ones)",
      "Q7: 47 + 38 → wrote 75 (added 7+8 but did not carry the ten)",
    ],
    confidence: "high",
    confidenceNote: "Pattern appears across 2+ items for the same students",
  },
  {
    pattern: "Multi-digit number confusion",
    description: "6 students concatenated digit strings instead of computing (e.g. 23 + 14 → wrote '314'). This suggests uncertainty about what operations mean.",
    affectedCount: 6,
    affectedPercent: 20,
    evidence: [
      "Q3: 23 + 14 → wrote '314' (concatenated 3, 1, 4)",
      "Q4: 45 − 21 → wrote '264' (concatenated digits)",
    ],
    confidence: "medium",
    confidenceNote: "Consistent across multiple questions for the same students",
  },
  {
    pattern: "Place value slipping in addition",
    description: "5 students performed operations correctly but misaligned tens and ones (e.g. 45 − 21 → 34 instead of 24, subtracting 4−1=3 tens).",
    affectedCount: 5,
    affectedPercent: 17,
    evidence: [
      "Q4: 45 − 21 → wrote 34 (subtracted 4−1=3 tens instead of 4−2=2)",
      "Q6: 53 − 28 → wrote 35 (partial regroup, tens miscounted)",
    ],
    confidence: "medium",
    confidenceNote: "Appears in 1–2 items per student; single-error pattern flagged for verification",
  },
];

// ── STEP 3 — CLASS LEARNING MAP ───────────────────────────────────────────
// 30 students distributed across learning tiers.

export const CLASS_MAP = [
  {
    tier: "foundational",
    label: "Foundational number skills",
    count: 6,
    color: "#DC2626",
    description: "Difficulty reading 2-digit numbers and understanding place value",
    students: ["Aarav", "Bhavna", "Chirag", "Diya", "Eshan", "Fatima"],
  },
  {
    tier: "add_sub",
    label: "Addition & subtraction foundations",
    count: 9,
    color: "#F59E0B",
    description: "Can add/subtract without regrouping; place value still developing",
    students: ["Gopal", "Hina", "Ishaan", "Jaya", "Kabir", "Lata", "Mohan", "Nisha", "Omkar"],
  },
  {
    tier: "regrouping",
    label: "Regrouping practice needed",
    count: 10,
    color: "#3B82F6",
    description: "Gets the basics; needs targeted practice on borrowing/exchanging",
    students: ["Priya", "Qadir", "Rani", "Sameer", "Tara", "Umesh", "Vidya", "Wahid", "Zoya", "Aditi"],
  },
  {
    tier: "advanced",
    label: "Ready to advance",
    count: 5,
    color: "#22C55E",
    description: "Demonstrated regrouping skills; ready for multiplication and multi-step",
    students: ["Rohit", "Sneha", "Vikram", "Meena", "Arjun"],
  },
];

// ── STEP 4 — GROUPS ────────────────────────────────────────────────────────
// Learning groups with focus areas and recommended activities.

export const DEMO_GROUPS = [
  {
    id: "g1",
    name: "Group A",
    tier: 0,
    focusLabel: "Foundational number skills",
    focusCompetency: "MATH_NUM_RECOG",
    memberCount: 6,
    recommendedActivity: "Number cards warm-up + tens-and-ones with bundles",
    members: ["Aarav", "Bhavna", "Chirag", "Diya", "Eshan", "Fatima"],
    currentCompetency: "Number recognition",
    focus: "Read and write 2-digit numbers confidently",
  },
  {
    id: "g2",
    name: "Group B",
    tier: 1,
    focusLabel: "Addition & subtraction foundations",
    focusCompetency: "MATH_ADD_NO_REGROUP",
    memberCount: 9,
    recommendedActivity: "Combine-the-piles with counters + take-away practice",
    members: ["Gopal", "Hina", "Ishaan", "Jaya", "Kabir", "Lata", "Mohan", "Nisha", "Omkar"],
    currentCompetency: "Addition/Subtraction (no regrouping)",
    focus: "Add and subtract 2-digit numbers without regrouping",
  },
  {
    id: "g3",
    name: "Group C",
    tier: 2,
    focusLabel: "Regrouping practice",
    focusCompetency: "MATH_SUB_REGROUP",
    memberCount: 10,
    recommendedActivity: "Regrouping with counters — exchange one ten for ten ones",
    members: ["Priya", "Qadir", "Rani", "Sameer", "Tara", "Umesh", "Vidya", "Wahid", "Zoya", "Aditi"],
    currentCompetency: "Subtraction with regrouping",
    focus: "Exchange one ten for ten ones when subtracting",
  },
  {
    id: "g4",
    name: "Group D",
    tier: 3,
    focusLabel: "Ready to advance",
    focusCompetency: "MATH_MULTIPLY",
    memberCount: 5,
    recommendedActivity: "Extension: multiplication as equal groups",
    members: ["Rohit", "Sneha", "Vikram", "Meena", "Arjun"],
    currentCompetency: "Multiplication basics",
    focus: "Multiplication as repeated addition; groups of objects",
  },
];

// ── STEP 5 — TODAY'S ACTION ───────────────────────────────────────────────
// The teacher's exact next 10 minutes.

export const TODAYS_ACTION = {
  headline: "10-minute regrouping activity for Group C (10 students)",
  group: "Group C",
  focus: "Subtraction with regrouping",
  warmUp: {
    title: "Warm-up (2 minutes)",
    description: "Show 42 as 4 bundles of sticks + 2 loose sticks. Ask: 'Can we take away 7 ones? What do we do?' Let the students see there are only 2 loose ones.",
  },
  mainActivity: {
    title: "Main activity (6 minutes)",
    steps: [
      "Exchange one bundle: open one bundle of 10 sticks into 10 loose sticks. Now there are 12 loose ones.",
      "Take away 7 loose ones. Count what's left: 5 loose + 3 bundles = 25.",
      "Write on the board: 42 − 17 = 25. Emphasize the exchange step.",
      "Give each student 20 counters/pebbles. Ask them to show 53 with bundles and loose.",
      "Guide: 'Take away 28. What happens when you can't take 8 from 3?'",
      "Students practice exchanging a bundle, then subtracting. Walk around and check.",
    ],
  },
  check: {
    title: "Quick check (2 minutes)",
    description: "Ask each student: 'What is 42 − 17? Show me with sticks first, then write the answer.'",
  },
  materials: ["Counters or pebbles (20 per student)", "Bundles of 10 sticks", "Loose sticks", "Blackboard", "Notebook"],
  expectedOutcome: "Students who perform the exchange correctly demonstrate regrouping. Others continue with guided support.",
};

// ── STEP 6 — QUICK REASSESSMENT ───────────────────────────────────────────
// 3 targeted questions for Group C, with deterministic demo answers.

export const REASSESSMENT_QUESTIONS = [
  { number: "1", text: "42 − 17 = ?", competencies: ["MATH_SUB_REGROUP"] },
  { number: "2", text: "53 − 28 = ?", competencies: ["MATH_SUB_REGROUP"] },
  { number: "3", text: "72 − 45 = ?", competencies: ["MATH_SUB_REGROUP"] },
];

// Deterministic reassessment answers for the 10 Group C students.
// After the activity, 7 demonstrate the skill (correct regrouping),
// 3 continue to need support.

export const REASSESSMENT_RESULTS = [
  { name: "Priya",   before: "needs_support",    after: "demonstrated", answers: ["25", "25", "27"], advanced: true },
  { name: "Qadir",   before: "needs_support",    after: "demonstrated", answers: ["25", "25", "27"], advanced: true },
  { name: "Rani",    before: "needs_support",    after: "demonstrated", answers: ["25", "25", "27"], advanced: true },
  { name: "Sameer",  before: "needs_support",    after: "demonstrated", answers: ["25", "25", "27"], advanced: true },
  { name: "Tara",    before: "needs_support",    after: "demonstrated", answers: ["25", "25", "27"], advanced: true },
  { name: "Umesh",   before: "needs_support",    after: "demonstrated", answers: ["25", "25", "27"], advanced: true },
  { name: "Vidya",   before: "needs_support",    after: "demonstrated", answers: ["25", "25", "27"], advanced: true },
  { name: "Wahid",   before: "needs_support",    after: "developing",   answers: ["25", "35", "27"], advanced: false },
  { name: "Zoya",    before: "needs_support",    after: "needs_support", answers: ["35", "35", "35"], advanced: false },
  { name: "Aditi",   before: "needs_support",    after: "needs_support", answers: ["35", "25", "35"], advanced: false },
];

// ── STEP 7 — REGROUP ──────────────────────────────────────────────────────
// Before/after student distribution.

export const REGROUP_BEFORE = {
  totalStudents: 30,
  needsSupport: 18,  // Groups A + B + C before activity
  developing: 7,
  demonstrated: 5,
};

export const REGROUP_AFTER = {
  totalStudents: 30,
  needsSupport: 11,  // 18 - 7 (Group C students who advanced)
  developing: 7,
  demonstrated: 12,  // 5 + 7 (advanced from Group C)
};

export const STUDENT_MOVEMENTS = [
  { name: "Priya",  from: "Group C (regrouping)", to: "Group D (ready to advance)", status: "demonstrated regrouping" },
  { name: "Qadir",  from: "Group C (regrouping)", to: "Group D (ready to advance)", status: "demonstrated regrouping" },
  { name: "Rani",   from: "Group C (regrouping)", to: "Group D (ready to advance)", status: "demonstrated regrouping" },
  { name: "Sameer", from: "Group C (regrouping)", to: "Group D (ready to advance)", status: "demonstrated regrouping" },
  { name: "Tara",   from: "Group C (regrouping)", to: "Group D (ready to advance)", status: "demonstrated regrouping" },
  { name: "Umesh",  from: "Group C (regrouping)", to: "Group D (ready to advance)", status: "demonstrated regrouping" },
  { name: "Vidya",  from: "Group C (regrouping)", to: "Group D (ready to advance)", status: "demonstrated regrouping" },
];

// ── STEP 8 — PROGRESS ─────────────────────────────────────────────────────
// Simple skill progression over time.

export const PROGRESS_TIMELINE = [
  { date: "Day 1 — Initial scan", demonstrated: 5, developing: 7, needsSupport: 18 },
  { date: "Day 1 — After activity", demonstrated: 12, developing: 7, needsSupport: 11 },
];

export const PROGRESS_NOTE = "More students demonstrated the target skill after the intervention. This shows observed change — not a claim that Kagaz caused the change.";

// ── Competency descriptions for the Understand step ────────────────────────
export const COMPETENCY_DETAILS = [
  {
    id: "MATH_SUB_REGROUP",
    label: "Subtraction with regrouping",
    status: "needs_support",
    confidence: "high",
    why: "12 of 30 students (40%) showed the same borrowing pattern across 2+ questions.",
    evidence: [
      { question: "Q5: 42 − 17", studentAnswer: "35", expected: "25", observation: "Student subtracted 7−2=5 ones without exchanging a ten" },
      { question: "Q6: 53 − 28", studentAnswer: "35", expected: "25", observation: "Same pattern: 8−3=5 ones, no borrow" },
    ],
    recommendation: "Use concrete materials (sticks, pebbles) to practise exchanging one ten for ten ones before subtracting.",
  },
  {
    id: "MATH_PLACE_VALUE",
    label: "Place value",
    status: "developing",
    confidence: "medium",
    why: "8 students (27%) showed inconsistency in aligning tens and ones during operations.",
    evidence: [
      { question: "Q4: 45 − 21", studentAnswer: "34", expected: "24", observation: "Subtracted 4−1=3 tens instead of 4−2=2 tens" },
    ],
    recommendation: "Reinforce 'tens stay with tens, ones stay with ones' using bundle-and-loose activities.",
  },
  {
    id: "MATH_NUM_RECOG",
    label: "Number recognition",
    status: "developing",
    confidence: "medium",
    why: "4 students (13%) could not reliably read multi-digit numbers aloud.",
    evidence: [
      { question: "Q1: Read aloud 17, 42, 85", studentAnswer: "17 only", expected: "17, 42, 85", observation: "Read first number, skipped the rest" },
    ],
    recommendation: "Daily 2-minute number card drill — student picks a card and reads it aloud.",
  },
];
