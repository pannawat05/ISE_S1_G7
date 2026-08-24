import { createContext, useContext, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Cookies from "js-cookie";
import { Sidebar } from "@/components/navigater";

type SidebarContextValue = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useProfileSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useProfileSidebar must be used within ProfileLayout");
  }
  return ctx;
}

export default function ProfileLayout() {
  const token = Cookies.get("authToken");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <SidebarContext.Provider value={{ isOpen: isSidebarOpen, setIsOpen: setIsSidebarOpen }}>
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
