import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { UserOrganizer } from "../../../api/organizer";

// ─── Re-export for convenience ────────────────────────────────────────────────
export type { UserOrganizer };

// ─── Sidebar open/close props ─────────────────────────────────────────────────
export interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

// ─── Nav item shape ───────────────────────────────────────────────────────────
export interface NavItem {
  name: string;
  icon: LucideIcon;
  /** base path — organizer id will be appended when dynamicOrgLink = true */
  link: string;
  requiresOrganizer: boolean;
  dynamicOrgLink?: boolean;
}

// ─── Menu items ───────────────────────────────────────────────────────────────
// links with dynamicOrgLink=true resolve to  `${link}/${selectedOrganizer.id}`
export const MENU_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    link: "/profile/dashboard",
    requiresOrganizer: true,
    dynamicOrgLink: true,
  },
  {
    name: "Events",
    icon: Calendar,
    link: "/profile/events",
    requiresOrganizer: true,
    dynamicOrgLink: true,
  },
  {
    name: "Attendees",
    icon: Users,
    link: "/profile/attendees",
    requiresOrganizer: true,
    dynamicOrgLink: true,
  },
  {
    name: "Analytics",
    icon: BarChart3,
    link: "/profile/analytics",
    requiresOrganizer: true,
    dynamicOrgLink: true,
  },
  {
    name: "ตั้งค่า Organizer",
    icon: Settings,
    link: "/profile/organizer",
    requiresOrganizer: true,
    dynamicOrgLink: true,
  },
];

// ─── Role helpers ─────────────────────────────────────────────────────────────
export function getRoleText(role: string): string {
  switch (role) {
    case "owner":   return "เจ้าของ";
    case "staff":   return "Staff";
    case "manager": return "Manager";
    default:        return role;
  }
}

export function getRoleColor(role: string): string {
  switch (role) {
    case "owner":   return "text-green-400";
    case "manager": return "text-blue-400";
    default:        return "text-gray-400";
  }
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}
