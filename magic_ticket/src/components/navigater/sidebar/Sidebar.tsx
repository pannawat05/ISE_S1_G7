import { useState } from "react";
import { Menu } from "lucide-react";
import { useSidebarOrganizers } from "./useSidebarOrganizers";
import SidebarOrganizerPicker from "./SidebarOrganizerPicker";
import SidebarNav from "./SidebarNav";
import SidebarFooter from "./SidebarFooter";
import CreateOrganizerModal from "../../organizer/CreateOrganizerModal";
import type { SidebarProps } from "./types";

function getDefaultOpen() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 768px)").matches;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [internalOpen, setInternalOpen] = useState(getDefaultOpen);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isSidebarOpen   = isOpen   ?? internalOpen;
  const setIsSidebarOpen = setIsOpen ?? setInternalOpen;

  const { organizers, selectedOrganizer, isLoading, setSelectedOrganizer, addOrganizer } =
    useSidebarOrganizers();

  function closeOnMobile() {
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }

  return (
    <>
      {/* ── Sidebar panel ──────────────────────────────────────────────── */}
      <aside
        className={`mt-sidebar md:h-full w-64 shrink-0 bg-surface
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <SidebarOrganizerPicker
          organizers={organizers}
          selectedOrganizer={selectedOrganizer}
          isLoading={isLoading}
          onSelect={setSelectedOrganizer}
          onCreateClick={() => setShowCreateModal(true)}
        />

        <SidebarNav selectedOrganizer={selectedOrganizer} onLinkClick={closeOnMobile} />

        <SidebarFooter onLinkClick={closeOnMobile} />
      </aside>

      {/* ── Mobile backdrop ─────────────────────────────────────────────── */}
      {isSidebarOpen && (
        <div
          className="md:hidden z-40 fixed inset-0 bg-black/60"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile hamburger (uncontrolled mode only) ───────────────────── */}
      {isOpen === undefined && !isSidebarOpen && (
        <div className="md:hidden top-0 left-0 z-30 fixed p-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="bg-elevated p-2 border border-white/10 rounded-lg text-white cursor-pointer"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      )}

      {/* ── Create Organizer Modal ──────────────────────────────────────── */}
      {showCreateModal && (
        <CreateOrganizerModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(org) => {
            addOrganizer(org);
            setShowCreateModal(false);
          }}
        />
      )}
    </>
  );
}
