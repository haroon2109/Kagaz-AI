// Mock Supabase client for local development
// Bypasses actual Supabase network requests and talks directly to the local FastAPI mock endpoints.

export const supabase = {
  auth: {
    getSession: async () => {
      let session = null;
      try {
        session = JSON.parse(localStorage.getItem('mock_supabase_session'));
      } catch (e) {}
      return { data: { session }, error: null };
    },
    onAuthStateChange: (callback) => {
      let session = null;
      try {
        session = JSON.parse(localStorage.getItem('mock_supabase_session'));
      } catch (e) {}
      
      // Trigger immediately with current state
      setTimeout(() => callback('INITIAL_SESSION', session), 0);
      
      // A simple listener for cross-tab auth sync, if needed.
      const handleStorage = (e) => {
        if (e.key === 'mock_supabase_session') {
           const newSession = e.newValue ? JSON.parse(e.newValue) : null;
           callback(newSession ? 'SIGNED_IN' : 'SIGNED_OUT', newSession);
        }
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', handleStorage);
      }
      
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              if (typeof window !== 'undefined') window.removeEventListener('storage', handleStorage);
            }
          }
        }
      };
    },
    signUp: async ({ email, password, options }) => {
      const RAW_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const BASE_URL = RAW_URL.endsWith("/api/v1") ? RAW_URL : `${RAW_URL.replace(/\/$/, "")}/api/v1`;
      const res = await fetch(`${BASE_URL}/auth/mock_signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: options?.data?.full_name || email })
      });
      if (!res.ok) {
        let err;
        try { err = await res.json(); } catch(e) {}
        return { data: null, error: new Error(err?.detail || "Signup failed") };
      }
      const data = await res.json();
      const session = { access_token: data.access_token, user: data.user };
      localStorage.setItem('mock_supabase_session', JSON.stringify(session));
      return { data: { user: data.user, session }, error: null };
    },
    signInWithPassword: async ({ email, password }) => {
      const RAW_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const BASE_URL = RAW_URL.endsWith("/api/v1") ? RAW_URL : `${RAW_URL.replace(/\/$/, "")}/api/v1`;
      const res = await fetch(`${BASE_URL}/auth/mock_login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: email })
      });
      if (!res.ok) {
        let err;
        try { err = await res.json(); } catch(e) {}
        return { data: null, error: new Error(err?.detail || "Invalid email or password") };
      }
      const data = await res.json();
      const session = { access_token: data.access_token, user: data.user };
      localStorage.setItem('mock_supabase_session', JSON.stringify(session));
      return { data: { user: data.user, session }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem('mock_supabase_session');
      return { error: null };
    }
  }
};
