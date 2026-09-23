"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Home, Users, Camera, Layers, TrendingUp, Lightbulb, FlaskConical } from "lucide-react";

/**
 * Kagaz AI sidebar — mirrors the primary navigation:
 * Home (Today's action) / Classes / Assess / Groups / Progress.
 */

const LINKS = [
  { href: "/today", icon: Home, label: "Home", match: (p) => p === "/" || p.startsWith("/today") },
  { href: "/classes", icon: Users, label: "Classes", match: (p) => p.startsWith("/classes") || p.startsWith("/students") },
  { href: "/assess", icon: Camera, label: "Assess", match: (p) => p.startsWith("/assess") || p.startsWith("/worksheet") },
  { href: "/groups", icon: Layers, label: "Groups", match: (p) => p.startsWith("/groups") },
  { href: "/progress", icon: TrendingUp, label: "Progress", match: (p) => p.startsWith("/progress") },
];

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const { user } = useAuth();

  const isActive = (link) => link.match(pathname);

  return (
    <aside
      className="w-60 flex-shrink-0 hidden md:flex flex-col h-[calc(100vh-56px)] sticky top-14"
      style={{
        background: "rgba(255, 255, 255, 0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRight: "1.5px solid var(--border)",
      }}
    >
      <nav className="flex flex-col gap-1.5 p-4 flex-1 pt-6">
        {LINKS.map((link) => {
          const active = isActive(link);
          const IconComponent = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{
                background: active ? "var(--primary-light)" : "transparent",
                border: active
                  ? "1.5px solid rgba(20, 184, 166, 0.15)"
                  : "1.5px solid transparent",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  background: active ? "var(--primary)" : "var(--surface-2)",
                  color: active ? "#ffffff" : "var(--text-3)",
                }}
              >
                <IconComponent size={18} />
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold leading-tight"
                  style={{ color: active ? "var(--primary-dark)" : "var(--text)" }}
                >
                  {link.label}
                </p>
                <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-3)" }}>
                  {link.href === "/today" && "Today's teaching action"}
                  {link.href === "/classes" && "Classes and students"}
                  {link.href === "/assess" && "Create & scan assessment"}
                  {link.href === "/groups" && "Learning groups"}
                  {link.href === "/progress" && "Learning progression"}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Internal tools */}
      <div className="px-4 pt-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Internal</p>
        {(() => {
          const evalActive = pathname.startsWith("/evaluation");
          return (
            <Link
              href="/evaluation"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
              style={{
                background: evalActive ? "var(--primary-light)" : "transparent",
                border: evalActive ? "1.5px solid rgba(20, 184, 166, 0.15)" : "1.5px solid transparent",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  background: evalActive ? "var(--primary)" : "var(--surface-2)",
                  color: evalActive ? "#ffffff" : "var(--text-3)",
                }}
              >
                <FlaskConical size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight" style={{ color: evalActive ? "var(--primary-dark)" : "var(--text)" }}>
                  Evaluation
                </p>
                <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-3)" }}>
                  Internal testing & metrics
                </p>
              </div>
            </Link>
          );
        })()}
      </div>

      {/* Tip box */}
      <div
        className="m-4 p-4 rounded-2xl"
        style={{
          background: "var(--primary-light)",
          border: "1px solid rgba(20, 184, 166, 0.15)",
        }}
      >
        <p className="text-sm font-bold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--primary-dark)" }}>
          <Lightbulb size={14} className="text-amber-500 fill-amber-100" />
          <span>The loop</span>
        </p>
        <p className="text-xs leading-relaxed font-medium" style={{ color: "var(--text-2)", opacity: 0.85 }}>
          Scan work → Understand → Group → Act → Reassess → Regroup.
        </p>
      </div>

      {/* User footer */}
      {user && (
        <div
          className="m-4 mt-0 p-3 rounded-xl border"
          style={{ background: "rgba(255, 255, 255, 0.7)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: "var(--primary)" }}
            >
              {(user.user_metadata?.full_name || user.email || "T")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                {user.user_metadata?.full_name || "Teacher"}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
