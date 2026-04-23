import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const MotoristaHome = () => {
  const { user } = useAuth();
  useEffect(() => { document.title = "Início | Motorista"; }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.email}</h1>
        <p className="text-sm text-muted-foreground">O fluxo de registro do motorista será habilitado em breve.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Esta é a Fase 1 do sistema. As telas do motorista (novo registro e histórico) virão na próxima entrega.
        </p>
        <div className="mt-4">
          <Button asChild variant="outline"><Link to="/app/historico">Meu histórico</Link></Button>
        </div>
      </div>
    </div>
  );
};

export default MotoristaHome;
