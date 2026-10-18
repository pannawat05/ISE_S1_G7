import NavbarActions from "./NavbarActions";
import NavbarBrand from "./NavbarBrand";
import NavbarNav from "./NavbarNav";

export const Navbar = () => {
  return (
    <nav
      className="top-0 z-50 sticky backdrop-blur-md px-6 py-4 border-b-2 w-full"
      style={{
        backgroundColor: "var(--mt-navbar-bg)",
        borderColor: "var(--mt-border)",
      }}
    >
      <div className="flex justify-between items-center gap-4 mx-auto max-w-7xl">
        <NavbarBrand />
        <NavbarNav />
        <NavbarActions />
      </div>
    </nav>
  );
};

export default Navbar;
