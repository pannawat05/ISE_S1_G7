import { getInitials, getRoleColor, getRoleText, type UserOrganizer } from "./types";

interface SidebarOrganizerItemProps {
  org: UserOrganizer;
  isSelected: boolean;
  onSelect: (org: UserOrganizer) => void;
}

export default function SidebarOrganizerItem({
  org,
  isSelected,
  onSelect,
}: SidebarOrganizerItemProps) {
  console.log(org)
  return (
    <button
      onClick={() => onSelect(org)}
      className={`flex w-full items-center justify-between px-3 py-3 transition-colors hover:bg-surface ${
        isSelected ? "bg-surface" : ""
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        {org.logo_url ? (
          <img
            src={org.logo_url}
            alt={org.name}
            className="rounded w-8 h-8 object-cover shrink-0"
          />
        ) : (
          <div className="flex justify-center items-center bg-violet-600 rounded w-8 h-8 font-bold text-white text-xs shrink-0">
            {getInitials(org.name)}
          </div>
        )}
        <span className="font-medium text-white text-sm truncate">{org.name}</span>
      </div>
      <span className={`ml-2 shrink-0 text-xs font-medium ${getRoleColor(org.role)}`}>
        {getRoleText(org.role)}
      </span>
    </button>
  );
}
