import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Clock, LogOut, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PendingApprovalScreen = () => {
  const { signOut, refreshProfile, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex flex-col items-center">
          <Logo className="mb-3 h-14 w-14" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
        </div>
        <h1 className="text-xl font-bold">Cadastro em análise</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu cadastro foi recebido e está aguardando liberação do administrador.
        </p>
        {user?.email && (
          <p className="mt-3 text-xs text-muted-foreground">
            Conta: <span className="font-medium text-foreground">{user.email}</span>
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={refreshProfile} variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" /> Já fui liberado, atualizar
          </Button>
          <Button onClick={handleLogout} variant="ghost">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Controle de BDT — Boletim Diário de Transporte · ASERP
        </p>
      </div>
    </div>
  );
};

export default PendingApprovalScreen;
