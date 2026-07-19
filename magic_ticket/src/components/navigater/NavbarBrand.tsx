import { Link } from "react-router-dom";
import { Logo } from "@/components/icon";

export default function NavbarBrand() {
  return (
    <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
      <Logo size={22} />
      <div className="flex flex-col leading-none">
        <span className="text-base font-bold text-white tracking-wide">
          Magic Ticket
        </span>
        <span className="text-[10px] font-medium text-gray-500 tracking-[0.15em] mt-0.5">
          ACCESS PLATFORM
        </span>
      </div>
    </Link>
  );
}
