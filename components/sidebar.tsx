"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/projects", label: "Projects", icon: "◧" },
  { href: "/projects", label: "Create Website", icon: "✦", isCreate: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop / tablet sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-border bg-panel/60 h-screen sticky top-0 px-4 py-6">
        <Link href="/" className="flex items-center gap-2 px-2 mb-8">
          <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-dark font-extrabold">
            H
          </span>
          <span className="font-bold tracking-tight">HEPRA</span>
        </Link>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-white/50 hover:text-white/90 px-3 py-2 text-left transition"
        >
          Sign out
        </button>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-panel/95 border-t border-border backdrop-blur flex justify-around py-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-white/70"
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-white/50"
        >
          <span>⏻</span>
          Sign out
        </button>
      </nav>
    </>
  );
}
