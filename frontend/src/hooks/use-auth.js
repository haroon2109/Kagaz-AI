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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Self-hosted auth: check localStorage
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
      // Bypassing login completely as requested
      const newUser = { id: "local_" + Date.now(), email, full_name: name || "Teacher" };
      const fakeToken = "mock_token_" + Date.now();
      saveSession(fakeToken, newUser);
      return { user: newUser, session: { access_token: fakeToken } };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      // Bypassing login completely as requested
      const newUser = { id: "local_" + Date.now(), email, full_name: "Teacher" };
      const fakeToken = "mock_token_" + Date.now();
      saveSession(fakeToken, newUser);
      return { user: newUser, session: { access_token: fakeToken } };
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
    setLoading(false);
  };

  const guestLogin = async () => {
    return await signIn("guest@kagaz.ai", "guest_password_123");
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
