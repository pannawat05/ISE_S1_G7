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
  const [organizers, setOrganizers] = useState<UserOrganizer[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<UserOrganizer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchMyOrganizers(token)
      .then((data) => {
        setOrganizers(data);
        if (data.length > 0) setSelectedOrganizer(data[0]);
      })
      .catch((err) => console.error("Failed to fetch organizers:", err))
      .finally(() => setIsLoading(false));
  }, []);

  function addOrganizer(org: UserOrganizer) {
    setOrganizers((prev) => [...prev, org]);
    setSelectedOrganizer(org);
  }

  return { organizers, selectedOrganizer, isLoading, setSelectedOrganizer, addOrganizer };
}
