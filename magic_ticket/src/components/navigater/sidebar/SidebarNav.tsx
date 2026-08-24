import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { MENU_ITEMS, type UserOrganizer } from "./types";

interface SidebarNavProps {
  selectedOrganizer: UserOrganizer | null;
  onLinkClick?: () => void;
}

export default function SidebarNav({ selectedOrganizer, onLinkClick }: SidebarNavProps) {
  const { pathname } = useLocation();

  return (
    <nav className="space-y-1 mt-4 px-4">
      {MENU_ITEMS.map((item) => {
        const isLocked = item.requiresOrganizer && !selectedOrganizer;
        const Icon = item.icon;

        // Build the actual link — dynamic items use the selected organizer's id
        const resolvedLink = item.dynamicOrgLink && selectedOrganizer
          ? `${item.link}/${selectedOrganizer.id}`
          : item.link;

        const isActive = item.dynamicOrgLink
          ? pathname.startsWith(item.link)
          : pathname === resolvedLink;

        if (isLocked) {
          return (
            <div
              key={item.link}
              title="สร้าง Organizer ก่อนเพื่อใช้งาน"
              className="flex justify-between items-center px-4 py-3 rounded-lg text-gray-600 cursor-not-allowed select-none"
            >
              <div className="flex items-center space-x-3">
                <Icon size={20} className="opacity-40 shrink-0" />
                <span className="opacity-40 font-medium whitespace-nowrap">{item.name}</span>
              </div>
              <Lock size={14} className="opacity-40 shrink-0" />
            </div>
          );
        }

        return (
          <Link
            key={item.link}
            to={resolvedLink}
            onClick={onLinkClick}
            className={`flex items-center space-x-3 rounded-lg px-4 py-3 transition-colors ${
              isActive
                ? "border border-purple-500/30 bg-violet-600/20 text-white"
                : "text-gray-400 hover:bg-elevated hover:text-white"
            }`}
          >
            <Icon size={20} className="shrink-0" />
            <span className="font-medium whitespace-nowrap">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
