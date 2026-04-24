import { ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

type NavItem = { to: string; label: string };

export const AppShell = ({ children, nav, title }: { children: ReactNode; nav: NavItem[]; title: string }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  // Truncar email longo para evitar quebra de layout
  const displayEmail = user?.email
    ? user.email.length > 24
      ? user.email.slice(0, 22) + "..."
      : user.email
    : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
          {/* Logo e nome do sistema */}
          <div className="flex items-center gap-3">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/" className="flex items-center gap-3">
              <Logo className="h-9 w-9" />
              <div className="flex flex-col">
                <span className="text-base font-bold leading-tight tracking-tight text-foreground">
                  Controle de BDT
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {title === "Admin" ? "Administrador" : title} · ASERP
                </span>
              </div>
            </Link>
          </div>

          {/* Navegacao desktop */}
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  cn(
                    "relative rounded-lg px-4 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-muted",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Usuario e logout */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 sm:flex">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[180px] truncate text-sm text-muted-foreground" title={user?.email}>
                {displayEmail}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 border-border text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        {/* Menu mobile */}
        {open && (
          <nav className="border-t border-border bg-card md:hidden">
            <div className="flex flex-col gap-1 p-3">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted",
                    )
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-2 sm:hidden">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-sm text-muted-foreground">{user?.email}</span>
              </div>
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">{children}</main>
    </div>
  );
};
