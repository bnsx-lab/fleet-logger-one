import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { Plus, History, FileText, Calendar, Car, MapPin, Clock, Gauge } from "lucide-react";

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

  useEffect(() => { document.title = "Inicio | Controle de BDT"; }, []);

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

  const nome = profile?.nome?.split(" ")[0] || user?.email?.split("@")[0] || "Motorista";

  return (
    <div className="space-y-8">
      {/* Saudacao - nome em destaque, email discreto */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Ola, {nome}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre suas jornadas de forma rapida e simples.
        </p>
      </div>

      {/* Botao principal de acao - DESTAQUE MAXIMO */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="h-16 gap-3 text-lg font-semibold shadow-md">
          <Link to="/app/novo">
            <Plus className="h-6 w-6" />
            Novo registro
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-16 gap-3 text-base font-medium">
          <Link to="/app/historico">
            <History className="h-5 w-5" />
            Meu historico
          </Link>
        </Button>
      </div>

      {/* Cards de estatisticas - mais elegantes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Hoje
            </span>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">
            {loading ? "-" : formatNumber(stats.hoje)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">registro(s)</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total
            </span>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">
            {loading ? "-" : formatNumber(stats.total)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">no historico</p>
        </div>
      </div>

      {/* Ultimo registro - card mais elaborado */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ultimo registro
        </h2>
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : !ultimo ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Nenhum registro ainda</h3>
            <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">
              Toque em &quot;Novo registro&quot; para registrar sua primeira jornada.
            </p>
          </div>
        ) : (
          <Link
            to="/app/historico"
            className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
          >
            {/* Header do card */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{formatDate(ultimo.data_referencia)}</span>
              </div>
              <StatusBadge status={ultimo.status} showIcon />
            </div>
            
            {/* Informacoes em grid organizado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Posto</p>
                  <p className="text-sm font-medium text-foreground">{ultimo.postos?.nome ?? "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Veiculo</p>
                  <p className="text-sm font-medium text-foreground">{ultimo.veiculos?.placa ?? "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Entrada</p>
                  <p className="text-sm font-medium text-foreground">{formatDateTime(ultimo.entrada_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Saida</p>
                  <p className="text-sm font-medium text-foreground">{formatDateTime(ultimo.saida_at)}</p>
                </div>
              </div>
            </div>
            
            {/* Destaque para KM rodados */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Quilometragem</span>
              </div>
              <span className="text-xl font-bold text-primary">{formatNumber(ultimo.km_rodados)} km</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};

export default MotoristaHome;
