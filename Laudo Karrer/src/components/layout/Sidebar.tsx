import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FilePlus, FileText, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/novo-laudo", label: "Novo Laudo", icon: FilePlus },
  { to: "/laudos", label: "Meus Laudos", icon: FileText },
];

export function Sidebar() {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleLogout() {
    logout();
    setConfirmOpen(false);
    navigate("/login");
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E2E8F0] bg-white md:flex">
      <div className="flex h-16 items-center px-6 text-lg font-semibold text-karrer-navy">
        Karrer
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition-colors",
                isActive && "border-karrer-navy bg-karrer-lightblue/10 text-karrer-blue",
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#E2E8F0] p-3">
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair do sistema?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Você precisará fazer login novamente para acessar seus laudos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLogout} className="bg-karrer-blue hover:bg-karrer-lightblue">
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
