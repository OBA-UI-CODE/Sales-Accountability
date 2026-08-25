"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icon";
import { navItemsForRole } from "@/lib/nav";
import type { Profile } from "@/types/database";

export function BottomNav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const items = navItemsForRole(profile.role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border-subtle bg-surface-elevated px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 py-1.5"
          >
            <NavIcon
              icon={item.icon}
              className={`h-5 w-5 ${
                active ? "text-accent-blue" : "text-text-muted"
              }`}
            />
            <span
              className={`text-[11px] font-medium ${
                active ? "text-accent-blue" : "text-text-muted"
              }`}
            >
              {item.label === "Sales History" ? "History" : item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
