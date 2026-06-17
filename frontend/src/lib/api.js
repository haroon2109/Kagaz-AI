import { supabase } from "./supabase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function request(path, options = {}) {
  let token = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      token = session.access_token;
    }
  } catch (err) {
    console.warn("Could not retrieve Supabase session token", err);
  }

  // Define headers. Let the browser handle boundary for FormData uploads
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  auth: {
    sync: (name) => request("/auth/sync", { method: "POST", body: JSON.stringify({ name }) }),
    me: () => request("/auth/me"),
  },
  worksheets: {
    list: () => request("/worksheets"),
    get: (id) => request(`/worksheets/${id}`),
    update: (id, payload) => request(`/worksheets/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    upload: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return request("/worksheets/upload", {
        method: "POST",
        body: formData,
      });
    },
    grade: (id) => request(`/worksheets/${id}/grade`, { method: "POST" }),
  },
  students: {
    list: () => request("/students"),
    get: (id) => request(`/students/${id}`),
  },
};
