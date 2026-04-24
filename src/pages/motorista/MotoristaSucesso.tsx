import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, History } from "lucide-react";

const MotoristaSucesso = () => {
  useEffect(() => { document.title = "Registro salvo"; }, []);
  return (
    <div className="mx-auto max-w-md space-y-6 py-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Registro salvo!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu registro foi enviado e está aguardando revisão do administrador.
        </p>
      </div>
      <div className="grid gap-2">
        <Button asChild size="lg"><Link to="/app/novo"><Plus className="mr-2 h-4 w-4" /> Novo registro</Link></Button>
        <Button asChild variant="outline" size="lg"><Link to="/app/historico"><History className="mr-2 h-4 w-4" /> Ver histórico</Link></Button>
        <Button asChild variant="ghost"><Link to="/app">Voltar ao início</Link></Button>
      </div>
    </div>
  );
};

export default MotoristaSucesso;
