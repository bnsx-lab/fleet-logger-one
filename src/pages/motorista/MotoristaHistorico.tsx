import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Row = {
  id: string;
  data_referencia: string;
  entrada_at: string;
  saida_at: string;
  km_saida: number;
  km_volta: number;
  km_rodados: number;
  status: RegistroStatus;
  postos: { nome: string } | null;
  veiculos: { placa: string } | null;
};

const MotoristaHistorico = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Meu histórico"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("registros")
        .select("id, data_referencia, entrada_at, saida_at, km_saida, km_volta, km_rodados, status, postos(nome), veiculos(placa)")
        .eq("profile_id", user.id)
        .order("data_referencia", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) toast.error("Erro ao carregar histórico.");
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Meu histórico</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${rows.length} registro${rows.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/app/novo"><Plus className="h-4 w-4" /> Novo</Link>
        </Button>
      </div>

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="Sem registros ainda"
          description="Quando você salvar seu primeiro registro, ele aparecerá aqui."
          action={
            <Button asChild>
              <Link to="/app/novo"><Plus className="mr-1.5 h-4 w-4" /> Criar primeiro registro</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{formatDate(r.data_referencia)}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Posto</span>
                    <p className="font-medium text-foreground">{r.postos?.nome ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Placa</span>
                    <p className="font-medium text-foreground">{r.veiculos?.placa ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Entrada</span>
                    <p className="font-medium text-foreground">{formatDateTime(r.entrada_at)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Saída</span>
                    <p className="font-medium text-foreground">{formatDateTime(r.saida_at)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Km rodados</span>
                  <span className="text-base font-bold text-primary">{formatNumber(r.km_rodados)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Placa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entrada</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saída</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Km rodados</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">{formatDate(r.data_referencia)}</td>
                    <td className="px-4 py-3 text-foreground">{r.postos?.nome ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.veiculos?.placa ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">{formatDateTime(r.entrada_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">{formatDateTime(r.saida_at)}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{formatNumber(r.km_rodados)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default MotoristaHistorico;
