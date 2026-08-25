import {
  Home,
  History,
  Package,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/lib/nav";

const ICONS: Record<NavItem["icon"], LucideIcon> = {
  home: Home,
  history: History,
  products: Package,
  settings: Settings,
};

export function NavIcon({
  icon,
  className,
}: {
  icon: NavItem["icon"];
  className?: string;
}) {
  const Icon = ICONS[icon];
  return <Icon className={className} strokeWidth={2} />;
}
