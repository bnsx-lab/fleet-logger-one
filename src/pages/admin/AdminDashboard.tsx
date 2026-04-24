import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatNumber } from "@/lib/format";
import { Link } from "react-router-dom";
import { Calendar, Clock, CheckCircle2, Edit3, ArrowRight, TrendingUp } from "lucide-react";

type Stats = { hoje: number; pendentes: number; aprovados: number; corrigidos: number };
type Recent = {
  id: string;
  data_referencia: string;
  km_rodados: number;
  status: RegistroStatus;
  motoristas: { nome_exibicao: string } | null;
  postos: { nome: string } | null;
  empresas: { nome: string } | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ hoje: 0, pendentes: 0, aprovados: 0, corrigidos: 0 });
  const [recent, setRecent] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Dashboard | Controle de BDT"; }, []);

  const load = async () => {
    const today = todayISO();
    const [hoje, pend, aprov, corr, rec] = await Promise.all([
      supabase.from("registros").select("id", { count: "exact", head: true }).eq("data_referencia", today),
      supabase.from("registros").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      supabase.from("registros").select("id", { count: "exact", head: true }).eq("status", "aprovado"),
      supabase.from("registros").select("id", { count: "exact", head: true }).eq("status", "corrigido"),
      supabase
        .from("registros")
        .select("id, data_referencia, km_rodados, status, motoristas(nome_exibicao), postos(nome), empresas(nome)")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    setStats({
      hoje: hoje.count ?? 0,
      pendentes: pend.count ?? 0,
      aprovados: aprov.count ?? 0,
      corrigidos: corr.count ?? 0,
    });
    setRecent((rec.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "registros" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cards = [
    {
      label: "Registros hoje",
      value: stats.hoje,
      icon: Calendar,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Pendentes",
      value: stats.pendentes,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Aprovados",
      value: stats.aprovados,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Corrigidos",
      value: stats.corrigidos,
      icon: Edit3,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visao geral das operacoes do sistema</p>
      </div>

      {/* Cards de indicadores - mais executivos */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg}`}>
                  <Icon className={`h-5 w-5 ${c.iconColor}`} />
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="mt-4 text-4xl font-bold tracking-tight text-foreground">
                {loading ? "-" : formatNumber(c.value)}
              </p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{c.label}</p>
            </div>
          );
        })}
      </div>

      {/* Registros recentes */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Registros recentes</h2>
          <Link
            to="/admin/registros"
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            title="Nenhum registro ainda"
            description="Quando os motoristas comecarem a registrar, eles aparecerao aqui."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motorista</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Posto</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Km rodados</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{formatDate(r.data_referencia)}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/registros/${r.id}`}
                        className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
                      >
                        {r.motoristas?.nome_exibicao ?? "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.empresas?.nome ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.postos?.nome ?? "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">{formatNumber(r.km_rodados)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
