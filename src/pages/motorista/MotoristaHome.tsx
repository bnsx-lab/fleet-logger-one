import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import type { RegistroStatus } from "@/lib/registros";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { Plus, History, FileText, Clock, FileEdit } from "lucide-react";

type Profile = { nome: string };
type Stats = { hoje: number; em_andamento: number; rascunhos: number; total: number };
type Ultimo = {
  id: string; data_referencia: string;
  entrada_at: string; saida_at: string | null;
  km_rodados: number; status: RegistroStatus;
  veiculos: { placa: string } | null;
} | null;

const todayISO = () => new Date().toISOString().slice(0, 10);

const MotoristaHome = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ hoje: 0, em_andamento: 0, rascunhos: 0, total: 0 });
  const [ultimo, setUltimo] = useState<Ultimo>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Início | Motorista"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = todayISO();
      const [p, hoje, andamento, rasc, total, ult] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
        supabase.from("registros").select("id", { count: "exact", head: true })
          .eq("profile_id", user.id).eq("data_referencia", today),
        supabase.from("registros").select("id", { count: "exact", head: true })
          .eq("profile_id", user.id).eq("status", "em_andamento"),
        supabase.from("registros").select("id", { count: "exact", head: true })
          .eq("profile_id", user.id).eq("status", "rascunho"),
        supabase.from("registros").select("id", { count: "exact", head: true })
          .eq("profile_id", user.id),
        supabase.from("registros")
          .select("id, data_referencia, entrada_at, saida_at, km_rodados, status, veiculos(placa)")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setProfile((p.data as any) ?? null);
      setStats({
        hoje: hoje.count ?? 0, em_andamento: andamento.count ?? 0,
        rascunhos: rasc.count ?? 0, total: total.count ?? 0,
      });
      setUltimo((ult.data as any) ?? null);
      setLoading(false);
    })();
  }, [user]);

  const nome = profile?.nome || user?.email?.split("@")[0] || "Motorista";

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold">Olá, {nome}</h1>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        <p className="mt-1 text-sm text-muted-foreground">Registre seu Boletim Diário de Transporte com poucos toques.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Hoje" value={stats.hoje} loading={loading} />
        <Card label="Em andamento" value={stats.em_andamento} loading={loading} accent={stats.em_andamento > 0} />
        <Card label="Rascunhos" value={stats.rascunhos} loading={loading} />
        <Card label="Total" value={stats.total} loading={loading} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="h-14 text-base">
          <Link to="/app/novo"><Plus className="mr-2 h-5 w-5" /> Iniciar saída</Link>
        </Button>
        {stats.em_andamento > 0 ? (
          <Button asChild variant="outline" size="lg" className="h-14 text-base">
            <Link to="/app/em-andamento"><Clock className="mr-2 h-5 w-5" /> Finalizar pendente ({stats.em_andamento})</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="lg" className="h-14 text-base">
            <Link to="/app/historico"><History className="mr-2 h-5 w-5" /> Meu histórico</Link>
          </Button>
        )}
      </div>

      {stats.rascunhos > 0 && (
        <Button asChild variant="ghost" className="w-full justify-start">
          <Link to="/app/rascunhos"><FileEdit className="mr-2 h-4 w-4" /> {stats.rascunhos} rascunho(s) aguardando envio</Link>
        </Button>
      )}

      <div>
        <h2 className="mb-2 text-base font-semibold">Último registro</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !ultimo ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">Nenhum registro ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">Toque em “Iniciar saída” para começar.</p>
          </div>
        ) : (
          <Link to="/app/historico"
            className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{formatDate(ultimo.data_referencia)}</span>
              <StatusBadge status={ultimo.status} viewer="motorista" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Placa:</span> {ultimo.veiculos?.placa ?? "—"}</div>
              <div><span className="text-muted-foreground">KM rodados:</span> <b>{formatNumber(ultimo.km_rodados)}</b></div>
              <div><span className="text-muted-foreground">Saída:</span> {formatDateTime(ultimo.entrada_at)}</div>
              <div><span className="text-muted-foreground">Retorno:</span> {ultimo.saida_at ? formatDateTime(ultimo.saida_at) : "—"}</div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};

const Card = ({ label, value, loading, accent }: { label: string; value: number; loading: boolean; accent?: boolean }) => (
  <div className={`rounded-xl border bg-card p-4 ${accent ? "border-primary/40" : "border-border"}`}>
    <p className="text-xs uppercase text-muted-foreground">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${accent ? "text-primary" : ""}`}>{loading ? "—" : formatNumber(value)}</p>
  </div>
);

export default MotoristaHome;
