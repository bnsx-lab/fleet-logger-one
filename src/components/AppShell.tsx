import { ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, ChevronDown } from "lucide-react";
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

  // Trunca e-mail para exibição elegante
  const displayEmail = user?.email
    ? user.email.length > 24
      ? user.email.slice(0, 22) + "..."
      : user.email
    : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header principal */}
      <header className="sticky top-0 z-30 border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          {/* Logo e branding */}
          <div className="flex items-center gap-3">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/" className="flex items-center gap-2.5">
              <Logo className="h-9 w-9" />
              <div className="leading-tight">
                <span className="block text-sm font-bold text-foreground">Controle de BDT</span>
                <span className="block text-[10px] font-medium uppercase tracking-wide text-primary">{title}</span>
              </div>
            </Link>
          </div>

          {/* Navegação desktop */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  cn(
                    "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-foreground/70 hover:bg-muted hover:text-foreground",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Usuário e logout */}
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground lg:inline" title={user?.email}>
              {displayEmail}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        {/* Menu mobile */}
        {open && (
          <nav className="border-t border-border bg-card md:hidden">
            <div className="flex flex-col gap-0.5 p-2">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-foreground/70 hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <div className="mt-2 border-t border-border pt-2 px-3 text-xs text-muted-foreground">
                {user?.email}
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Conteúdo principal */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
};
