import type { Role } from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  icon: "home" | "history" | "products" | "settings";
  ownerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/history", label: "Sales History", icon: "history" },
  { href: "/products", label: "Products", icon: "products", ownerOnly: true },
  { href: "/settings", label: "Settings", icon: "settings", ownerOnly: true },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.ownerOnly || role === "owner");
}
