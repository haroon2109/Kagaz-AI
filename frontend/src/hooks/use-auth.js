"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  signUp: async (email, password, name) => {},
  signIn: async (email, password) => {},
  signOut: async () => {},
  guestLogin: async () => {},
});

const GUEST_KEY = "kagaz_guest_email";

// Map a backend teacher record to the user shape the UI already expects
const toUiUser = (teacher) => ({
  id: teacher.id,
  email: teacher.email,
  user_metadata: { full_name: teacher.name || teacher.email.split("@")[0] },
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage (token issued by our own backend)
    const savedToken = localStorage.getItem("kagaz_token");
    const savedUser = localStorage.getItem("kagaz_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const saveSession = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("kagaz_token", newToken);
    localStorage.setItem("kagaz_user", JSON.stringify(newUser));
  };

  const signUp = async (email, password, name) => {
    setLoading(true);
    try {
      const res = await api.auth.signup({ email, password, name });
      const me = await api.auth.me(res.access_token);
      const uiUser = toUiUser(me);
      saveSession(res.access_token, uiUser);
      return { user: uiUser, session: res };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      const me = await api.auth.me(res.access_token);
      const uiUser = toUiUser(me);
      saveSession(res.access_token, uiUser);
      return { user: uiUser, session: res };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setUser(null);
    setToken(null);
    localStorage.removeItem("kagaz_token");
    localStorage.removeItem("kagaz_user");
    localStorage.removeItem(GUEST_KEY);
    setLoading(false);
  };

  // "Get Started for Free" → creates/logs into a local guest account
  // deterministically derived from this browser, no typing required.
  const guestLogin = async () => {
    setLoading(true);
    try {
      let guestEmail = null;
      try {
        guestEmail = localStorage.getItem(GUEST_KEY);
      } catch (_) {}

      if (!guestEmail) {
        const random = Math.random().toString(36).slice(2, 10);
        // NOTE: must be a validation-safe domain (email-validator rejects
        // reserved names like .local / .test) — no mail is ever sent.
        guestEmail = `guest_${random}@example.com`;
      }

      try {
        // Try login first (returning guest)
        const res = await api.auth.login({ email: guestEmail, password: "guest_kagaz" });
        const me = await api.auth.me(res.access_token);
        saveSession(res.access_token, toUiUser(me));
        localStorage.setItem(GUEST_KEY, guestEmail);
        return { user: toUiUser(me), session: res };
      } catch (loginErr) {
        // New guest → create the account
        const res = await api.auth.signup({
          email: guestEmail,
          password: "guest_kagaz",
          name: "Guest Teacher",
        });
        const me = await api.auth.me(res.access_token);
        saveSession(res.access_token, toUiUser(me));
        localStorage.setItem(GUEST_KEY, guestEmail);
        return { user: toUiUser(me), session: res };
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signUp, signIn, signOut, guestLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
