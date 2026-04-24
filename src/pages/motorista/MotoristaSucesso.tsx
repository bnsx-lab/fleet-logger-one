import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, History, Home } from "lucide-react";

const MotoristaSucesso = () => {
  useEffect(() => { document.title = "Registro salvo"; }, []);
  
  return (
    <div className="mx-auto max-w-md space-y-8 py-8 text-center">
      {/* Ícone de sucesso */}
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      
      {/* Mensagem */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Registro salvo!</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Seu registro foi enviado com sucesso e está aguardando revisão do administrador.
        </p>
      </div>
      
      {/* Ações */}
      <div className="grid gap-3 pt-2">
        <Button asChild size="lg" className="h-12 gap-2 text-base font-semibold">
          <Link to="/app/novo">
            <Plus className="h-5 w-5" /> Novo registro
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-11 gap-2">
          <Link to="/app/historico">
            <History className="h-4 w-4" /> Ver meu histórico
          </Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
          <Link to="/app">
            <Home className="h-4 w-4" /> Voltar ao início
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default MotoristaSucesso;
