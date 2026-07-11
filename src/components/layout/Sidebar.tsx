"use client";

import { FileCsv } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const NAV_ITEMS = [
  { href: "/", label: "Import Data", icon: FileCsv },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-(--color-border)/50 bg-(--color-surface) flex flex-col h-full hidden md:flex shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-(--color-border)/50">
        <div className="flex items-center gap-2 text-(--color-primary)">
          <FileCsv size={28} weight="fill" />
          <span className="font-semibold text-lg text-(--color-foreground) tracking-tighter">GrowEasy</span>
        </div>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-1 relative">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) z-10",
                isActive
                  ? "text-(--color-primary)"
                  : "text-(--color-foreground)/60 hover:text-(--color-foreground)"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-(--color-primary)/10 rounded-lg -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon size={18} weight={isActive ? "fill" : "regular"} className="shrink-0" />
              <span className="tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-(--color-border)/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-(--color-surface-hover) transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-(--color-primary) to-blue-500 flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-sm">
            GE
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium tracking-tight truncate">GrowEasy Workspace</span>
            <span className="text-xs text-(--color-foreground)/50 tracking-tight truncate">Pro Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
