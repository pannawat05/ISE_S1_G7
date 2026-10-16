import Swal from 'sweetalert2';
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { fetchMyOrganizers } from "../../../api/organizer";
import type { UserOrganizer } from "./types";

export interface UseSidebarOrganizersReturn {
  organizers: UserOrganizer[];
  selectedOrganizer: UserOrganizer | null;
  isLoading: boolean;
  setSelectedOrganizer: React.Dispatch<React.SetStateAction<UserOrganizer | null>>;
  addOrganizer: (org: UserOrganizer) => void;
}

export function useSidebarOrganizers(): UseSidebarOrganizersReturn {
  const token = Cookies.get("authToken");
  const [organizers, setOrganizers] = useState<UserOrganizer[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<UserOrganizer | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(token));

  useEffect(() => {
    if (!token) return;

    fetchMyOrganizers(token)
      .then((data) => {
        setOrganizers(data);
        if (data.length > 0) setSelectedOrganizer(data[0]);
      })
      .catch((error: unknown) => {
        console.error(error);
        void Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text:
            error instanceof Error && error.message
              ? error.message
              : "ไม่สามารถโหลดข้อมูล Organizer ได้ กรุณาลองใหม่อีกครั้ง",
          confirmButtonColor: '#7c3aed',
        });
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  function addOrganizer(org: UserOrganizer) {
    setOrganizers((prev) => [...prev, org]);
    setSelectedOrganizer(org);
  }

  return { organizers, selectedOrganizer, isLoading, setSelectedOrganizer, addOrganizer };
}
