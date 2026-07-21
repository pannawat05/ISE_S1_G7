import { useState } from "react";
import { ChevronDown, Building2, Plus } from "lucide-react";
import SidebarOrganizerItem from "./SidebarOrganizerItem";
import { getInitials, getRoleText, type UserOrganizer } from "./types";
import { useNavigate } from "react-router-dom";

interface SidebarOrganizerPickerProps {
  organizers: UserOrganizer[];
  selectedOrganizer: UserOrganizer | null;
  isLoading: boolean;
  onSelect: (org: UserOrganizer) => void;
  onCreateClick: () => void;
}

export default function SidebarOrganizerPicker({
  organizers,
  selectedOrganizer,
  isLoading,
  onSelect,
  onCreateClick,
}: SidebarOrganizerPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const goto = useNavigate();

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="px-4 py-4 border-white/5 border-b">
        <div className="bg-white/5 rounded-lg h-16 animate-pulse" />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (organizers.length === 0) {
    return (
      <div className="px-4 py-4 border-white/5 border-b">
        <div className="bg-white/[0.03] px-4 py-4 border border-white/15 border-dashed rounded-lg text-center">
          <Building2 size={28} className="mx-auto mb-2 text-gray-500" />
          <p className="font-medium text-gray-400 text-xs">ยังไม่มี Organizer</p>
          <p className="mt-0.5 text-gray-600 text-xs">สร้าง organizer เพื่อเริ่มจัดงาน</p>
          <button
            onClick={onCreateClick}
            className="flex justify-center items-center gap-1.5 bg-violet-600/20 hover:bg-violet-600/30 mt-3 px-3 py-2 rounded-lg w-full font-semibold text-violet-300 text-xs transition-colors"
          >
            <Plus size={14} />
            สร้าง Organizer ใหม่
          </button>
        </div>
      </div>
    );
  }

  // ── Has organizers ─────────────────────────────────────────────────────────
  const ownerOrgs = organizers.filter((o) => o.role === "owner");
  const memberOrgs = organizers.filter((o) => o.role !== "owner");

  return (
    <div className="relative px-4 py-4 border-white/5 border-b">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex justify-between items-center bg-elevated hover:bg-elevated/80 px-3 py-3 rounded-lg w-full transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center space-x-3 min-w-0">
          {selectedOrganizer?.logo_url ? (
            <img
              src={selectedOrganizer.logo_url}
              alt={selectedOrganizer.name}
              className="rounded-md w-10 h-10 object-cover shrink-0"
            />
          ) : (
            <div className="flex justify-center items-center bg-violet-600 rounded-md w-10 h-10 font-bold text-white text-sm shrink-0">
              {selectedOrganizer ? getInitials(selectedOrganizer.name) : "MT"}
            </div>
          )}
          <div className="flex flex-col items-start min-w-0">
            <span className="w-full font-semibold text-white text-sm truncate">
              {selectedOrganizer?.name ?? "เลือก Organizer"}
            </span>
            <span className="text-gray-400 text-xs">
              {selectedOrganizer ? getRoleText(selectedOrganizer.role) : ""}
            </span>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`ml-2 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="top-full right-4 left-4 z-50 absolute bg-elevated shadow-xl mt-2 border border-white/10 rounded-lg max-h-80 overflow-y-auto"
        >
          {ownerOrgs.length > 0 && (
            <>
              <div className="px-3 py-2">
                <p className="text-gray-500 text-xs">Organizer ของฉัน</p>
              </div>
              {ownerOrgs.map((org) => (
                <SidebarOrganizerItem
                  key={org.id}
                  org={org}
                  isSelected={selectedOrganizer?.id === org.id}
                  onSelect={(o) => { onSelect(o); setIsOpen(false); goto("/profile/organizer/"+org.id) }}
                />
              ))}
            </>
          )}

          {memberOrgs.length > 0 && (
            <>
              <div className="px-3 py-2 border-white/5 border-t">
                <p className="text-gray-500 text-xs">งานที่เป็น Staff</p>
              </div>
              {memberOrgs.map((org) => (
                <SidebarOrganizerItem
                  key={org.id}
                  org={org}
                  isSelected={selectedOrganizer?.id === org.id}
                  onSelect={(o) => { onSelect(o); setIsOpen(false); }}
                />
              ))}
            </>
          )}

          <button
            onClick={() => { setIsOpen(false); onCreateClick(); }}
            className="flex items-center space-x-3 hover:bg-surface px-3 py-3 border-white/5 border-t w-full text-violet-400 transition-colors"
          >
            <Plus size={18} />
            <span className="font-medium text-sm">+ สร้าง Organizer ใหม่</span>
          </button>
        </div>
      )}
    </div>
  );
}
