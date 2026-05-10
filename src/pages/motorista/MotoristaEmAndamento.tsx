import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { Plus, Clock, ArrowRight } from "lucide-react";

type Row = {
  id: string;
  data_referencia: string;
  entrada_at: string;
  km_saida: number;
  veiculos: { placa: string } | null;
};

const MotoristaEmAndamento = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Em andamento | Controle de BDT"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("registros")
        .select("id, data_referencia, entrada_at, km_saida, veiculos(placa)")
        .eq("profile_id", user.id)
        .eq("status", "em_andamento")
        .order("entrada_at", { ascending: false });
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Em andamento</h1>
          <p className="text-sm text-muted-foreground">{loading ? "Carregando..." : `${rows.length} saída(s) sem finalizar`}</p>
        </div>
        <Button asChild><Link to="/app/novo"><Plus className="mr-1 h-4 w-4" /> Nova saída</Link></Button>
      </div>

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="Nenhuma saída em andamento"
          description="Quando você iniciar uma saída, ela aparecerá aqui aguardando finalização."
          action={<Button asChild><Link to="/app/novo"><Plus className="mr-1 h-4 w-4" /> Iniciar saída</Link></Button>}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Link
              key={r.id}
              to={`/app/registros/${r.id}/finalizar`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning-foreground" />
                  <span className="text-sm font-semibold">{formatDate(r.data_referencia)}</span>
                  <span className="text-xs text-muted-foreground">· {r.veiculos?.placa ?? "—"}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Saída {formatDateTime(r.entrada_at)} · KM inicial {formatNumber(r.km_saida)}
                </p>
              </div>
              <span className="inline-flex items-center text-sm font-medium text-primary">
                Finalizar <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MotoristaEmAndamento;
