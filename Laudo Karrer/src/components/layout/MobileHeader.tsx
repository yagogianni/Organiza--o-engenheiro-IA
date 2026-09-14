import { Menu, X, LayoutDashboard, FilePlus, FileText, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/novo-laudo", label: "Novo Laudo", icon: FilePlus },
  { to: "/laudos", label: "Meus Laudos", icon: FileText },
];

interface MobileHeaderProps {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

export function MobileHeader({ drawerOpen, onToggleDrawer }: MobileHeaderProps) {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 md:hidden">
        <span className="text-base font-semibold text-karrer-navy">Karrer</span>
        <button
          aria-label={drawerOpen ? "Fechar menu" : "Abrir menu"}
          onClick={onToggleDrawer}
          className="text-slate-600"
        >
          {drawerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onToggleDrawer} aria-hidden="true" />
          <nav className="relative z-50 flex h-full w-64 flex-col bg-white p-4 shadow-xl">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={onToggleDrawer}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm font-medium text-slate-600",
                    isActive && "border-karrer-navy bg-karrer-lightblue/10 text-karrer-blue",
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="mt-auto flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600"
            >
              <LogOut size={18} />
              Logout
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
