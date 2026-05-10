import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import type { RegistroStatus } from "@/lib/registros";
import { STATUS_FINAIS } from "@/lib/registros";
import { formatDate, formatNumber } from "@/lib/format";
import { Link } from "react-router-dom";

type Stats = {
  hoje: number; em_andamento: number; rascunhos: number;
  km_mes: number; saidas_mes: number; fotos: number;
};
type Recent = {
  id: string; data_referencia: string; km_rodados: number; status: RegistroStatus;
  motoristas: { nome_exibicao: string } | null;
  veiculos: { placa: string } | null;
};
type Top = { label: string; value: number };

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfMonthISO = () => {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ hoje: 0, em_andamento: 0, rascunhos: 0, km_mes: 0, saidas_mes: 0, fotos: 0 });
  const [recent, setRecent] = useState<Recent[]>([]);
  const [topVeiculos, setTopVeiculos] = useState<Top[]>([]);
  const [topMotoristas, setTopMotoristas] = useState<Top[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Dashboard | Admin"; }, []);

  const load = async () => {
    const today = todayISO();
    const fromMonth = startOfMonthISO();
    const [hoje, andamento, rasc, mesAgg, fotosCount, rec] = await Promise.all([
      supabase.from("registros").select("id", { count: "exact", head: true }).eq("data_referencia", today),
      supabase.from("registros").select("id", { count: "exact", head: true }).eq("status", "em_andamento"),
      supabase.from("registros").select("id", { count: "exact", head: true }).eq("status", "rascunho"),
      supabase.from("registros")
        .select("km_rodados, motoristas(nome_exibicao), veiculos(placa)")
        .in("status", STATUS_FINAIS as any)
        .gte("data_referencia", fromMonth).lte("data_referencia", today)
        .limit(5000),
      supabase.from("registro_fotos").select("id", { count: "exact", head: true }),
      supabase.from("registros")
        .select("id, data_referencia, km_rodados, status, motoristas(nome_exibicao), veiculos(placa)")
        .order("created_at", { ascending: false }).limit(8),
    ]);

    let kmTotal = 0; const placasMap = new Map<string, number>(); const motoMap = new Map<string, number>();
    for (const r of (mesAgg.data as any[]) ?? []) {
      kmTotal += Number(r.km_rodados) || 0;
      const placa = r.veiculos?.placa ?? "—";
      placasMap.set(placa, (placasMap.get(placa) ?? 0) + (Number(r.km_rodados) || 0));
      const m = r.motoristas?.nome_exibicao ?? "—";
      motoMap.set(m, (motoMap.get(m) ?? 0) + 1);
    }
    const top5 = (m: Map<string, number>) =>
      Array.from(m.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    setStats({
      hoje: hoje.count ?? 0,
      em_andamento: andamento.count ?? 0,
      rascunhos: rasc.count ?? 0,
      km_mes: kmTotal,
      saidas_mes: ((mesAgg.data as any[]) ?? []).length,
      fotos: fotosCount.count ?? 0,
    });
    setTopVeiculos(top5(placasMap));
    setTopMotoristas(top5(motoMap));
    setRecent((rec.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel("admin-dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "registros" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cards = [
    { label: "Hoje", value: stats.hoje },
    { label: "Em andamento", value: stats.em_andamento, accent: stats.em_andamento > 0 },
    { label: "Rascunhos", value: stats.rascunhos },
    { label: "KM no mês", value: stats.km_mes },
    { label: "Saídas no mês", value: stats.saidas_mes },
    { label: "Fotos enviadas", value: stats.fotos },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral em tempo real.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border bg-card p-4 ${c.accent ? "border-primary/40" : "border-border"}`}>
            <p className="text-xs uppercase text-muted-foreground">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.accent ? "text-primary" : ""}`}>{loading ? "—" : formatNumber(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TopList title="Veículos com mais KM no mês" rows={topVeiculos} suffix="km" />
        <TopList title="Motoristas mais ativos no mês" rows={topMotoristas} suffix="saídas" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Registros recentes</h2>
          <Link to="/admin/registros" className="text-sm font-medium text-primary hover:underline">Ver todos</Link>
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
                  <th className="px-4 py-2">Placa</th>
                  <th className="px-4 py-2">KM</th>
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
                    <td className="px-4 py-2">{r.veiculos?.placa ?? "—"}</td>
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

const TopList = ({ title, rows, suffix }: { title: string; rows: Top[]; suffix: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <h3 className="mb-3 text-sm font-semibold">{title}</h3>
    {rows.length === 0 ? (
      <p className="text-xs text-muted-foreground">Sem dados no mês.</p>
    ) : (
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className="truncate">{i + 1}. {r.label}</span>
            <span className="font-semibold">{formatNumber(r.value)} <span className="text-xs text-muted-foreground">{suffix}</span></span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default AdminDashboard;
