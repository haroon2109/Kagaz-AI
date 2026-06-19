"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { LayoutDashboard, Camera, Lightbulb, User } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();

  const isActive = (href) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const links = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      labelKey: "dashboard",
    },
    {
      href: "/dashboard/batch",
      icon: Camera,
      labelKey: "uploadWorksheets",
    },
  ];

  return (
    <aside
      className="w-64 flex-shrink-0 hidden md:flex flex-col h-[calc(100vh-56px)] sticky top-14"
      style={{
        background: "rgba(255, 255, 255, 0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRight: "1.5px solid var(--border)",
      }}
    >
      <nav className="flex flex-col gap-2 p-4 flex-1 pt-6">
        {links.map((link) => {
          const active = isActive(link.href);
          const IconComponent = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group"
              style={{
                background: active ? "var(--primary-light)" : "transparent",
                border: active
                  ? "1.5px solid rgba(20, 184, 166, 0.15)"
                  : "1.5px solid transparent",
              }}
            >
              {/* Icon container */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  background: active ? "var(--primary)" : "var(--surface-2)",
                  color: active ? "#ffffff" : "var(--text-3)",
                }}
              >
                <IconComponent size={18} />
              </div>

              {/* Label */}
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold leading-tight transition-all"
                  style={{ color: active ? "var(--primary-dark)" : "var(--text)" }}
                >
                  {t(link.labelKey)}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

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
          <span>{t("quickTip")}</span>
        </p>
        <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--text-2)", opacity: 0.85 }}>
          {t("quickTipText")}
        </p>
      </div>

      {/* User footer */}
      {user && (
        <div
          className="m-4 mt-0 p-3 rounded-xl border border-slate-100"
          style={{ background: "rgba(255, 255, 255, 0.7)" }}
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
              <p className="text-sm truncate" style={{ color: "var(--text-3)" }}>
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
