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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiUrl}/auth/mock_signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name })
      });
      if (!res.ok) throw new Error("Sign up failed");
      
      // Auto-login
      return await signIn(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      });
      
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      
      const newUser = { id: data.access_token.substring(0, 10), email, full_name: "Teacher" };
      saveSession(data.access_token, newUser);
      return { user: newUser, session: { access_token: data.access_token } };
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
    setLoading(true);
    try {
      const email = "guest@kagaz.ai";
      const password = "guest_password_123";
      const name = "Guest Teacher";
      
      // Try to signup first just in case
      try {
        await signUp(email, password, name);
      } catch (err) {}
      
      return await signIn(email, password);
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
