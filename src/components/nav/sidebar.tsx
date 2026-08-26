"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NavIcon } from "./nav-icon";
import { navItemsForRole } from "@/lib/nav";
import { logout } from "@/app/actions/logout";
import type { Profile } from "@/types/database";

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const items = navItemsForRole(profile.role);

  return (
    <aside className="hidden w-[240px] shrink-0 flex-col bg-surface-elevated md:flex">
      <div className="flex items-center gap-3 px-5 py-8">
        <div className="h-9 w-9 shrink-0 rounded-full bg-accent-blue" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-text-primary">
            T-Max Store
          </p>
          <p className="text-xs capitalize text-text-secondary">
            {profile.role}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-5">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-accent-blue text-text-primary"
                  : "text-text-secondary hover:bg-surface-card hover:text-text-primary"
              }`}
            >
              <NavIcon icon={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={logout} className="px-5 py-8">
        <button
          type="submit"
          className="flex items-center gap-3 text-sm font-medium text-text-secondary transition hover:text-text-primary"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          Log out
        </button>
      </form>
    </aside>
  );
}
