import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatNumber } from "@/lib/format";
import { Link } from "react-router-dom";

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
    { label: "Registros hoje", value: stats.hoje },
    { label: "Pendentes", value: stats.pendentes },
    { label: "Aprovados", value: stats.aprovados },
    { label: "Corrigidos", value: stats.corrigidos },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{loading ? "—" : formatNumber(c.value)}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Registros recentes</h2>
          <Link to="/admin/registros" className="text-sm font-medium text-primary hover:text-primary-hover">Ver todos</Link>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : recent.length === 0 ? (
          <EmptyState title="Nenhum registro ainda" description="Quando os motoristas começarem a registrar, eles aparecerão aqui." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Motorista</th>
                  <th className="px-4 py-2">Empresa</th>
                  <th className="px-4 py-2">Posto</th>
                  <th className="px-4 py-2">Km</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2">{formatDate(r.data_referencia)}</td>
                    <td className="px-4 py-2">
                      <Link to={`/admin/registros/${r.id}`} className="font-medium text-primary hover:underline">
                        {r.motoristas?.nome_exibicao ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{r.empresas?.nome ?? "—"}</td>
                    <td className="px-4 py-2">{r.postos?.nome ?? "—"}</td>
                    <td className="px-4 py-2">{formatNumber(r.km_rodados)}</td>
                    <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
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
