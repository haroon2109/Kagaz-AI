
// Same-origin API by default: Next.js rewrites proxy /api/* to the backend
// (set NEXT_PUBLIC_API_ORIGIN at build time to change the proxy target).
// On Vercel + Render, this avoids CORS entirely and works in every environment.
const RAW_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
const BASE_URL = RAW_URL.endsWith("/api/v1") ? RAW_URL : `${RAW_URL.replace(/\/$/, "")}/api/v1`;

const getAuthHeaders = async (isFormData = false, overrideToken = null) => {
  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const token = overrideToken || localStorage.getItem("kagaz_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("Could not retrieve session token", err);
  }

  return headers;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function friendlyError(status, detail) {
  if (status === 0 || status === undefined) {
    return navigator.onLine === false
      ? "You appear to be offline. Check your connection and try again."
      : "Could not reach the Kagaz AI server. Check your connection and try again.";
  }
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 413) return "That file is too large. Maximum size is 5MB.";
  if (status === 429) return "Too many requests — please wait a moment and try again.";
  if (status >= 500) return "The Kagaz AI server had a problem. Please try again in a moment.";
  return detail || `Request failed (${status}).`;
}

async function request(path, options = {}, overrideToken = null) {
  const isFormData = options.body instanceof FormData;
  const authHeaders = await getAuthHeaders(isFormData, overrideToken);

  const headers = {
    ...authHeaders,
    ...options.headers,
  };

  // Bounded auto-retry for idempotent GETs hitting transient failures
  // (offline blips, sleeping Render instance waking up). Never retried:
  // mutations with a body — a double-upload would create duplicate scans.
  const method = (options.method || "GET").toUpperCase();
  const maxAttempts = method === "GET" ? 3 : 1;

  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Include response body in error for easier debugging
        let detail = response.statusText;
        try {
          const body = await response.json();
          detail = body.detail || JSON.stringify(body);
        } catch (_) {}

        // 5xx on a GET is transient — back off and try again
        if (response.status >= 500 && attempt < maxAttempts) {
          lastErr = new Error(friendlyError(response.status, detail));
          await sleep(800 * attempt);
          continue;
        }
        throw new Error(friendlyError(response.status, detail));
      }

      const json = await response.json();
      console.log(`[API] Raw response from ${path}:`, json);
      return json;
    } catch (err) {
      // TypeError from fetch = network-level failure (offline, DNS, refused).
      const isNetworkFailure = err instanceof TypeError;
      if (isNetworkFailure && attempt < maxAttempts) {
        lastErr = new Error(friendlyError(0));
        await sleep(800 * attempt);
        continue;
      }
      throw err instanceof Error && err.message && !isNetworkFailure
        ? err
        : (lastErr || new Error(friendlyError(0)));
    }
  }
  throw lastErr || new Error(friendlyError(0));
}

export const api = {
  auth: {
    signup: ({ email, password, name }) => request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name }) }),
    login: ({ email, password }) => request("/auth/token", { method: "POST", body: JSON.stringify({ email, password }) }),
    sync: (name) => request("/auth/sync", { method: "POST", body: JSON.stringify({ name }) }),
    me: (overrideToken) => request("/auth/me", {}, overrideToken),
  },
  worksheets: {
    list: () => request("/worksheets"),
    get: (id) => request(`/worksheets/${id}`),
    // Create a new worksheet record → triggers OCR as a BackgroundTask
    create: (payload) => request("/worksheets", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/worksheets/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    upload: async (file) => {
      let uploadFile = file;
      try {
        const { compressImage } = await import("../utils/image-compressor");
        uploadFile = await compressImage(file, 1600, 0.80);
      } catch (err) {
        console.warn("[API] Client-side image compression error, uploading original:", err);
      }
      const formData = new FormData();
      formData.append("file", uploadFile);
      return request("/worksheets/upload", {
        method: "POST",
        body: formData,
      });
    },
    // Trigger LLM grading after teacher marks correct/incorrect
    grade: (id) => request(`/worksheets/${id}/grade`, { method: "POST" }),
    // Re-trigger OCR on a failed or existing worksheet
    process: (id) => request(`/worksheets/process/${id}`, { method: "POST" }),
    // Log human-in-the-loop override
    logBiasCorrection: (id, payload) => request(`/worksheets/${id}/bias-correction`, { method: "POST", body: JSON.stringify(payload) }),
  },
  students: {
    list: () => request("/students"),
    get: (id) => request(`/students/${id}`),
  },
  // ── Learning loop (assess → understand → group → act → reassess) ──────────
  learning: {
    // Classes
    listClasses: () => request("/classes"),
    createClass: (payload) => request("/classes", { method: "POST", body: JSON.stringify(payload) }),
    getClass: (id) => request(`/classes/${id}`),
    getClassMap: (id) => request(`/classes/${id}/map`),
    getToday: (id) => request(`/classes/${id}/today`),
    // AI coaching note — separate, fail-soft endpoint (null when AI unavailable)
    getTodayNarrative: (id) => request(`/classes/${id}/today/narrative`),
    getProgress: (id) => request(`/classes/${id}/progress`),
    getGroups: (id) => request(`/classes/${id}/groups`),
    rebuildGroups: (id) => request(`/classes/${id}/groups/rebuild`, { method: "POST" }),
    // Assessments
    getTemplates: () => request("/assessments/templates"),
    createAssessment: (payload) => request("/assessments", { method: "POST", body: JSON.stringify(payload) }),
    getAssessment: (id) => request(`/assessments/${id}`),
    attachScan: (id, payload) => request(`/assessments/${id}/scan`, { method: "POST", body: JSON.stringify(payload) }),
    // Analysis
    analyzeWorksheet: (id) => request(`/worksheets/${id}/analyze`, { method: "POST" }),
    studentProfile: (id) => request(`/students/${id}/profile`),
    reviewEvidence: (evidenceId, payload) => request(`/evidence/${evidenceId}/review`, { method: "POST", body: JSON.stringify(payload) }),
    sendPatternFeedback: (payload) => request("/patterns/feedback", { method: "POST", body: JSON.stringify(payload) }),
    evaluationExport: () => request("/evaluation"),
    // ── Internal evaluation records ──────────────────────────────────────────
    getEvaluationRecords: () => request("/evaluation/records"),
    createEvaluationRecord: (payload) => request("/evaluation/records", { method: "POST", body: JSON.stringify(payload) }),
    updateEvaluationRecord: (id, payload) => request(`/evaluation/records/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    deleteEvaluationRecord: (id) => request(`/evaluation/records/${id}`, { method: "DELETE" }),
    getEvaluationMetrics: () => request("/evaluation/metrics"),
    getEvaluationExport: () => request("/evaluation/export"),
    importEvaluationCSV: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const headers = {};
      try {
        const token = localStorage.getItem("kagaz_token");
        if (token) headers["Authorization"] = `Bearer ${token}`;
      } catch (_) {}
      const resp = await fetch(`${BASE_URL}/evaluation/import`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!resp.ok) {
        let detail = resp.statusText;
        try { detail = (await resp.json()).detail || detail; } catch (_) {}
        throw new Error(`Import failed (${resp.status}): ${detail}`);
      }
      return resp.json();
    },
    // Groups & interventions
    getIntervention: (competencyId) => request(`/interventions/${competencyId}`),
    reassessGroup: (groupId, payload = {}) => request(`/groups/${groupId}/reassess`, { method: "POST", body: JSON.stringify(payload) }),
    completeReassess: (assessmentId) => request(`/assessments/${assessmentId}/reassess/complete`, { method: "POST" }),
    completeIntervention: (interventionId, payload) => request(`/interventions/${interventionId}/complete`, { method: "POST", body: JSON.stringify(payload) }),
    // Framework + demo
    getFramework: (subject) => request(`/framework${subject ? `?subject=${subject}` : ""}`),
    demoSetup: () => request("/demo/setup", { method: "POST" }),
  },
};

