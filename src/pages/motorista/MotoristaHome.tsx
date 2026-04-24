import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { Plus, History, FileText, TrendingUp, Calendar } from "lucide-react";

type Profile = { nome: string };
type Stats = { hoje: number; total: number };
type UltimoRegistro = {
  id: string;
  data_referencia: string;
  entrada_at: string;
  saida_at: string;
  km_rodados: number;
  status: RegistroStatus;
  postos: { nome: string } | null;
  veiculos: { placa: string } | null;
} | null;

const todayISO = () => new Date().toISOString().slice(0, 10);

const MotoristaHome = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ hoje: 0, total: 0 });
  const [ultimo, setUltimo] = useState<UltimoRegistro>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Início | Motorista"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = todayISO();
      const [p, hoje, total, ult] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
        supabase.from("registros").select("id", { count: "exact", head: true })
          .eq("profile_id", user.id).eq("data_referencia", today),
        supabase.from("registros").select("id", { count: "exact", head: true })
          .eq("profile_id", user.id),
        supabase.from("registros")
          .select("id, data_referencia, entrada_at, saida_at, km_rodados, status, postos(nome), veiculos(placa)")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setProfile((p.data as any) ?? null);
      setStats({ hoje: hoje.count ?? 0, total: total.count ?? 0 });
      setUltimo((ult.data as any) ?? null);
      setLoading(false);
    })();
  }, [user]);

  const nome = profile?.nome || user?.email?.split("@")[0] || "Motorista";

  return (
    <div className="space-y-6">
      {/* Saudação com destaque no nome */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Bem-vindo de volta,</p>
        <h1 className="mt-0.5 text-2xl font-bold text-foreground">{nome}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Registre suas jornadas de forma rápida e simples.
        </p>
      </div>

      {/* CTA Principal - Novo Registro */}
      <Button asChild size="lg" className="h-14 w-full gap-2.5 text-base font-semibold shadow-sm">
        <Link to="/app/novo">
          <Plus className="h-5 w-5" /> Novo registro
        </Link>
      </Button>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{loading ? "—" : formatNumber(stats.hoje)}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{loading ? "—" : formatNumber(stats.total)}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>

      {/* Link para histórico */}
      <Button asChild variant="outline" size="lg" className="h-12 w-full gap-2 text-sm font-medium">
        <Link to="/app/historico">
          <History className="h-4 w-4" /> Ver meu histórico
        </Link>
      </Button>

      {/* Último registro */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Último registro
        </h2>
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : !ultimo ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Nenhum registro ainda</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Toque no botão acima para criar seu primeiro registro.
            </p>
          </div>
        ) : (
          <Link
            to="/app/historico"
            className="block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{formatDate(ultimo.data_referencia)}</span>
              <StatusBadge status={ultimo.status} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Posto</span>
                <p className="font-medium text-foreground">{ultimo.postos?.nome ?? "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Placa</span>
                <p className="font-medium text-foreground">{ultimo.veiculos?.placa ?? "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Entrada</span>
                <p className="font-medium text-foreground">{formatDateTime(ultimo.entrada_at)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Saída</span>
                <p className="font-medium text-foreground">{formatDateTime(ultimo.saida_at)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-accent/50 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Km rodados</span>
              <span className="text-lg font-bold text-primary">{formatNumber(ultimo.km_rodados)}</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};

export default MotoristaHome;
