import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MapPin, Car, Gauge, Clock, ArrowRight } from "lucide-react";

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

  useEffect(() => { document.title = "Meu historico | Controle de BDT"; }, []);

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
      if (error) toast.error("Erro ao carregar historico.");
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu historico</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${rows.length} registro(s) encontrado(s)`}
          </p>
        </div>
        <Button asChild className="gap-2 shadow-sm">
          <Link to="/app/novo">
            <Plus className="h-4 w-4" />
            Novo registro
          </Link>
        </Button>
      </div>

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="Sem registros ainda"
          description="Quando voce salvar seu primeiro registro, ele aparecera aqui."
          action={
            <Button asChild className="gap-2">
              <Link to="/app/novo">
                <Plus className="h-4 w-4" />
                Criar primeiro registro
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile cards - mais elegantes */}
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                {/* Header do card */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground">{formatDate(r.data_referencia)}</span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                
                {/* Informacoes */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate text-foreground">{r.postos?.nome ?? "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <Car className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{r.veiculos?.placa ?? "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground">{formatDateTime(r.entrada_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground">{formatDateTime(r.saida_at)}</span>
                  </div>
                </div>
                
                {/* KM rodados - destaque */}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Gauge className="h-4 w-4 text-primary" />
                    <span>{formatNumber(r.km_saida)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{formatNumber(r.km_volta)}</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{formatNumber(r.km_rodados)} km</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table - mais elegante */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Posto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entrada</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saida</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Odometro saida</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Odometro volta</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Km rodados</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{formatDate(r.data_referencia)}</td>
                    <td className="px-4 py-3 text-foreground">{r.postos?.nome ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.veiculos?.placa ?? "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(r.entrada_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(r.saida_at)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatNumber(r.km_saida)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatNumber(r.km_volta)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">{formatNumber(r.km_rodados)}</td>
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
