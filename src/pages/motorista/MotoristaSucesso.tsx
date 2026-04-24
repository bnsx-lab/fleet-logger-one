import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, History, Home } from "lucide-react";

const MotoristaSucesso = () => {
  useEffect(() => { document.title = "Registro salvo | Controle de BDT"; }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {/* Icone de sucesso */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 shadow-sm ring-1 ring-emerald-100">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
      </div>

      {/* Titulo e descricao */}
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Registro salvo com sucesso!
      </h1>
      <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
        Seu registro foi enviado e esta aguardando a revisao do administrador.
      </p>

      {/* Acoes */}
      <div className="mt-8 grid w-full gap-3">
        <Button asChild size="lg" className="h-12 gap-2 text-base font-semibold shadow-md">
          <Link to="/app/novo">
            <Plus className="h-5 w-5" />
            Novo registro
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-12 gap-2 text-base">
          <Link to="/app/historico">
            <History className="h-5 w-5" />
            Ver historico
          </Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
          <Link to="/app">
            <Home className="h-4 w-4" />
            Voltar ao inicio
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default MotoristaSucesso;
