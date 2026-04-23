import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

type Registro = {
  id: string;
  data_referencia: string;
  entrada_at: string;
  saida_at: string;
  km_saida: number;
  km_volta: number;
  km_rodados: number;
  observacao: string | null;
  status: RegistroStatus;
  motoristas: { nome_exibicao: string } | null;
  empresas: { nome: string } | null;
  postos: { nome: string } | null;
  veiculos: { placa: string } | null;
};

type Audit = {
  id: string;
  campo_alterado: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  status_anterior: RegistroStatus | null;
  status_novo: RegistroStatus | null;
  motivo: string | null;
  created_at: string;
  alterado_por_profile_id: string;
};

// Transições permitidas
const transitions: Record<RegistroStatus, RegistroStatus[]> = {
  pendente: ["revisado", "cancelado"],
  revisado: ["aprovado", "corrigido"],
  aprovado: [],
  corrigido: ["revisado"],
  cancelado: [],
};

const requiresMotivo = (next: RegistroStatus) => next === "corrigido" || next === "cancelado";

const AdminRegistroDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reg, setReg] = useState<Registro | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextStatus, setNextStatus] = useState<RegistroStatus | "">("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Detalhe do registro"; }, []);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [r, a] = await Promise.all([
      supabase
        .from("registros")
        .select("id, data_referencia, entrada_at, saida_at, km_saida, km_volta, km_rodados, observacao, status, motoristas(nome_exibicao), empresas(nome), postos(nome), veiculos(placa)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("auditoria_registros")
        .select("*")
        .eq("registro_id", id)
        .order("created_at", { ascending: false }),
    ]);
    if (r.error || !r.data) { toast.error("Registro não encontrado."); navigate("/admin/registros"); return; }
    setReg(r.data as any);
    setAudit((a.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const allowed = reg ? transitions[reg.status] : [];

  const onChangeStatus = async () => {
    if (!reg || !nextStatus || !user) return;
    if (requiresMotivo(nextStatus as RegistroStatus) && motivo.trim().length < 3) {
      toast.error("Informe um motivo (mínimo 3 caracteres).");
      return;
    }
    setSaving(true);
    const prev = reg.status;
    const { error: updErr } = await supabase
      .from("registros")
      .update({ status: nextStatus })
      .eq("id", reg.id);
    if (updErr) { setSaving(false); toast.error("Erro ao atualizar."); return; }
    const { error: audErr } = await supabase.from("auditoria_registros").insert({
      registro_id: reg.id,
      alterado_por_profile_id: user.id,
      status_anterior: prev,
      status_novo: nextStatus as RegistroStatus,
      motivo: motivo.trim() || null,
    });
    setSaving(false);
    if (audErr) toast.warning("Status atualizado, mas auditoria falhou.");
    else toast.success("Status atualizado.");
    setNextStatus(""); setMotivo("");
    load();
  };

  if (loading || !reg) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/admin/registros"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Registro</h1>
          <p className="text-sm text-muted-foreground">Detalhes e auditoria</p>
        </div>
        <StatusBadge status={reg.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Motorista">{reg.motoristas?.nome_exibicao ?? "—"}</Card>
        <Card title="Empresa">{reg.empresas?.nome ?? "—"}</Card>
        <Card title="Posto">{reg.postos?.nome ?? "—"}</Card>
        <Card title="Placa">{reg.veiculos?.placa ?? "—"}</Card>
        <Card title="Data referência">{formatDate(reg.data_referencia)}</Card>
        <Card title="Km rodados">{formatNumber(reg.km_rodados)}</Card>
        <Card title="Entrada">{formatDateTime(reg.entrada_at)}</Card>
        <Card title="Saída">{formatDateTime(reg.saida_at)}</Card>
        <Card title="Km saída">{formatNumber(reg.km_saida)}</Card>
        <Card title="Km volta">{formatNumber(reg.km_volta)}</Card>
      </div>

      {reg.observacao && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Observação</p>
          <p className="mt-1 text-sm">{reg.observacao}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold">Alterar status</h2>
        {allowed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma transição disponível para o status atual.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {allowed.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNextStatus(s)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    nextStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  → {s}
                </button>
              ))}
            </div>
            {nextStatus && requiresMotivo(nextStatus) && (
              <div className="space-y-1">
                <Label>Motivo (obrigatório)</Label>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={500} />
              </div>
            )}
            <Button onClick={onChangeStatus} disabled={!nextStatus || saving}>
              {saving ? "Salvando..." : "Confirmar alteração"}
            </Button>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold">Histórico de auditoria</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem alterações registradas.</p>
        ) : (
          <ul className="space-y-2">
            {audit.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDateTime(a.created_at)}</span>
                </div>
                <div className="mt-1">
                  {a.status_anterior && a.status_novo ? (
                    <span>Status: <b>{a.status_anterior}</b> → <b>{a.status_novo}</b></span>
                  ) : a.campo_alterado ? (
                    <span>Campo <b>{a.campo_alterado}</b>: {a.valor_anterior ?? "—"} → {a.valor_novo ?? "—"}</span>
                  ) : <span>Alteração</span>}
                </div>
                {a.motivo && <p className="mt-1 text-muted-foreground">Motivo: {a.motivo}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs uppercase text-muted-foreground">{title}</p>
    <p className="mt-1 text-sm font-medium">{children}</p>
  </div>
);

export default AdminRegistroDetalhe;
