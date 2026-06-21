
const RAW_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const BASE_URL = RAW_URL.endsWith("/api/v1") ? RAW_URL : `${RAW_URL.replace(/\/$/, "")}/api/v1`;

const getAuthHeaders = async (isFormData = false) => {
  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const token = localStorage.getItem("kagaz_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("Could not retrieve session token", err);
  }

  return headers;
};

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const authHeaders = await getAuthHeaders(isFormData);
  
  const headers = {
    ...authHeaders,
    ...options.headers,
  };

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
    throw new Error(`API error ${response.status}: ${detail}`);
  }

  const json = await response.json();
  console.log(`[API] Raw response from ${path}:`, json);
  return json;
}

export const api = {
  auth: {
    sync: (name) => request("/auth/sync", { method: "POST", body: JSON.stringify({ name }) }),
    me: () => request("/auth/me"),
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
};

