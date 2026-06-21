"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Home, Camera, Globe, LogOut, Menu, X, User } from "lucide-react";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const navLinks = [
    { href: "/dashboard", icon: Home, labelKey: "dashboard" },
    { href: "/dashboard/batch", icon: Camera, labelKey: "uploadWorksheets" },
  ];

  return (
    <nav
      className="glass-panel"
      style={{
        background: "rgba(255, 255, 255, 0.85)",
        borderBottom: "1.5px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="flex h-14 items-center px-4 md:px-6 max-w-screen-2xl mx-auto justify-between">
        
        <div className="flex items-center gap-6">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 no-underline">
            <img
              src="/logo.png"
              alt="Kagaz AI Logo"
              className="h-10 w-auto rounded-lg object-contain bg-white"
            />
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const IconComponent = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: active ? "var(--primary-light)" : "transparent",
                      color: active ? "var(--primary)" : "var(--text-3)",
                    }}
                  >
                    <IconComponent size={16} />
                    <span>{t(link.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border border-[rgba(20,184,166,0.2)] hover:bg-[var(--primary-light)] transition-all cursor-pointer"
            style={{ color: "var(--primary)", background: "rgba(255,255,255,0.8)" }}
            title="Toggle Language / भाषा बदलें"
          >
            <Globe size={14} />
            <span>{{en:"English",hi:"हिन्दी",ta:"தமிழ்",ml:"മലയാളം",te:"తెలుగు",ur:"اردو"}[language]}</span>
          </button>

          {user ? (
            <>
              {/* User badge */}
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-[rgba(20,184,166,0.1)]"
                style={{
                  background: "var(--primary-light)",
                  color: "var(--primary-dark)",
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: "var(--primary)" }}
                >
                  {(user.user_metadata?.full_name || user.email || "T")[0].toUpperCase()}
                </div>
                <span className="max-w-[130px] truncate">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>

              {/* Sign out */}
              <button
                onClick={signOut}
                className="btn btn-ghost btn-sm flex items-center gap-1.5 cursor-pointer"
                style={{ minHeight: 36 }}
              >
                <LogOut size={14} />
                <span>{t("signOut")}</span>
              </button>
            </>
          ) : (
              <Link href="/login" className="btn btn-primary btn-sm cursor-pointer">
                Get Started
              </Link>
          )}

          {/* Mobile menu toggle */}
          {user && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 cursor-pointer"
              style={{ color: "var(--text-3)" }}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && user && (
        <div
          className="md:hidden px-4 py-3 space-y-1 border-t animate-slide-up"
          style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.95)" }}
        >
          {navLinks.map(link => {
            const IconComponent = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: active ? "var(--primary-light)" : "transparent",
                  color: active ? "var(--primary)" : "var(--text-2)",
                }}
              >
                <IconComponent size={18} />
                <span>{t(link.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
