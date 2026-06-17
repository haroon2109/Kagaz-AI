import React from "react";
import Link from "next/link";

export default function Sidebar() {
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/batch", label: "Batch Capture" },
    { href: "/dashboard/worksheets", label: "Worksheets" },
    { href: "/dashboard/students", label: "Students Roster" },
    { href: "/dashboard/analytics", label: "Performance Insights" },
  ];

  return (
    <aside className="w-64 border-r bg-muted/40 h-[calc(100vh-64px)] hidden md:block">
      <div className="flex flex-col space-y-2 p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
