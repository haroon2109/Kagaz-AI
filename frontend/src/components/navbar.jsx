"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Home, Camera, Globe, LogOut, Menu, X, Users, Layers, TrendingUp } from "lucide-react";

/**
 * Kagaz AI primary navigation — Home / Classes / Assess / Groups / Progress.
 * Teacher-first: five items, always visible, large touch targets.
 */

const NAV_LINKS = [
  { href: "/today", icon: Home, label: "Home", match: (p) => p.startsWith("/today") },
  { href: "/classes", icon: Users, label: "Classes", match: (p) => p.startsWith("/classes") || p.startsWith("/students") },
  { href: "/assess", icon: Camera, label: "Assess", match: (p) => p.startsWith("/assess") || p.startsWith("/worksheet") },
  { href: "/groups", icon: Layers, label: "Groups", match: (p) => p.startsWith("/groups") },
  { href: "/progress", icon: TrendingUp, label: "Progress", match: (p) => p.startsWith("/progress") },
];

// Legacy routes map onto the new IA so old links keep working
const LEGACY_REDIRECTS = {
  "/dashboard": "/today",
  "/dashboard/batch": "/assess",
};

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);

  // Transparently redirect legacy dashboard URLs to the new IA
  React.useEffect(() => {
    const target = LEGACY_REDIRECTS[pathname];
    if (target && typeof window !== "undefined") {
      window.location.replace(target);
    }
  }, [pathname]);

  const isActive = (link) => link.match(pathname);

  const visibleLinks = user ? NAV_LINKS : [];

  return (
    <nav
      className="glass-panel"
      style={{
        background: "rgba(255, 255, 255, 0.9)",
        borderBottom: "1.5px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="flex h-14 items-center px-4 md:px-6 max-w-screen-2xl mx-auto justify-between">
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          {/* Brand */}
          <Link href={user ? "/today" : "/"} className="flex items-center gap-2 flex-shrink-0 no-underline">
            <img
              src="/logo.svg"
              alt="Kagaz AI"
              className="h-9 w-auto rounded-lg object-contain bg-white"
            />
            <span className="hidden sm:flex flex-col leading-none">
              <span className="text-sm font-extrabold text-slate-900">Kagaz AI</span>
              <span className="text-[10px] font-semibold text-slate-500">
                From student work to the next teaching action
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          {visibleLinks.length > 0 && (
            <div className="hidden md:flex items-center gap-1">
              {visibleLinks.map((link) => {
                const IconComponent = link.icon;
                const active = isActive(link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: active ? "var(--primary-light)" : "transparent",
                      color: active ? "var(--primary)" : "var(--text-3)",
                      minHeight: 40,
                    }}
                  >
                    <IconComponent size={16} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-bold border hover:bg-[var(--primary-light)] transition-all cursor-pointer"
            style={{ color: "var(--primary)", background: "rgba(255,255,255,0.8)", borderColor: "rgba(20,184,166,0.2)" }}
            title="Toggle Language / भाषा बदलें"
          >
            <Globe size={14} />
            <span className="hidden sm:inline">{{ en: "English", hi: "हिन्दी", ta: "தமிழ்", ml: "മലയാളം", te: "తెలుగు", ur: "اردو" }[language]}</span>
          </button>

          {user ? (
            <>
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ background: "var(--primary)" }}
                >
                  {(user.user_metadata?.full_name || user.email || "T")[0].toUpperCase()}
                </div>
                <span className="max-w-[110px] truncate">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
              <button
                onClick={signOut}
                className="btn btn-ghost btn-sm flex items-center gap-1.5 cursor-pointer"
                style={{ minHeight: 36 }}
                title={t("signOut")}
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm cursor-pointer">
              Get Started
            </Link>
          )}

          {user && (
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg border cursor-pointer"
              style={{ color: "var(--text-3)", borderColor: "var(--border)" }}
              aria-label="Menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown — large touch targets */}
      {menuOpen && user && (
        <div
          className="md:hidden px-4 py-3 space-y-1 border-t animate-slide-up"
          style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.97)" }}
        >
          {visibleLinks.map((link) => {
            const IconComponent = link.icon;
            const active = isActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-base font-semibold transition-all"
                style={{
                  background: active ? "var(--primary-light)" : "transparent",
                  color: active ? "var(--primary)" : "var(--text-2)",
                }}
              >
                <IconComponent size={20} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
