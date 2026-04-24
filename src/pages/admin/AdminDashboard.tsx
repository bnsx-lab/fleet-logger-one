import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatNumber } from "@/lib/format";
import { Link } from "react-router-dom";
import { Calendar, Clock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

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

  useEffect(() => { document.title = "Dashboard | Admin"; }, []);

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
    { label: "Registros hoje", value: stats.hoje, icon: Calendar, accent: "primary" },
    { label: "Pendentes", value: stats.pendentes, icon: Clock, accent: "warning" },
    { label: "Aprovados", value: stats.aprovados, icon: CheckCircle, accent: "success" },
    { label: "Corrigidos", value: stats.corrigidos, icon: AlertCircle, accent: "muted" },
  ];

  return (
    <div className="space-y-8">
      {/* Header executivo */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral do sistema de controle de BDT
        </p>
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const accentClasses = {
            primary: "bg-primary/10 text-primary",
            warning: "bg-warning/10 text-warning",
            success: "bg-success/10 text-success",
            muted: "bg-muted text-muted-foreground",
          }[c.accent];
          
          return (
            <div key={c.label} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{loading ? "—" : formatNumber(c.value)}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentClasses}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
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
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : recent.length === 0 ? (
          <EmptyState 
            title="Nenhum registro ainda" 
            description="Quando os motoristas começarem a registrar, eles aparecerão aqui." 
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motorista</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posto</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Km</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">{formatDate(r.data_referencia)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/registros/${r.id}`} className="font-medium text-primary hover:underline">
                        {r.motoristas?.nome_exibicao ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{r.empresas?.nome ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{r.postos?.nome ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{formatNumber(r.km_rodados)}</td>
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
