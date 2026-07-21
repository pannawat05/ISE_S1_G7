import NavbarActions from "./NavbarActions";
import NavbarBrand from "./NavbarBrand";
import NavbarNav from "./NavbarNav";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-md border-b-2 border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
        <NavbarBrand />
        <NavbarNav />
        <NavbarActions />
      </div>
    </nav>
  );
}
