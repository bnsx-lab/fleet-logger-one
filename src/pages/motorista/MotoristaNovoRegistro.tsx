import { useEffect, useMemo, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import {
  EMPRESA_PADRAO_ID,
  ensureVeiculoByPlaca,
  combineDateTime,
  resolveSaidaAt,
  normalizePlaca,
} from "@/lib/registros";

type Posto = { id: string; nome: string };
type MotoristaCtx = { id: string; empresa_id: string; posto_principal_id: string | null };

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const MotoristaNovoRegistro = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [motorista, setMotorista] = useState<MotoristaCtx | null>(null);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [loadingCtx, setLoadingCtx] = useState(true);

  const [postoId, setPostoId] = useState("");
  const [placa, setPlaca] = useState("");
  const [dataRef, setDataRef] = useState(todayISO());
  const [horaEntrada, setHoraEntrada] = useState(nowHHMM());
  const [horaSaida, setHoraSaida] = useState("");
  const [kmSaida, setKmSaida] = useState("");
  const [kmVolta, setKmVolta] = useState("");
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Novo registro"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [m, p] = await Promise.all([
        supabase
          .from("motoristas")
          .select("id, empresa_id, posto_principal_id")
          .eq("profile_id", user.id)
          .maybeSingle(),
        supabase.from("postos").select("id, nome").eq("status", "ativo").order("nome"),
      ]);
      const mot = (m.data as any) ?? null;
      setMotorista(mot);
      setPostos((p.data as any) ?? []);
      if (mot?.posto_principal_id) setPostoId(mot.posto_principal_id);
      setLoadingCtx(false);
    })();
  }, [user]);

  const kmRodados = useMemo(() => {
    const a = Number(kmSaida);
    const b = Number(kmVolta);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return b - a;
  }, [kmSaida, kmVolta]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !user || !motorista) return;

    if (!postoId) return toast.error("Selecione o posto.");
    if (normalizePlaca(placa).length < 5) return toast.error("Informe uma placa válida.");
    if (!dataRef) return toast.error("Informe a data de referência.");
    if (!horaEntrada || !horaSaida) return toast.error("Informe entrada e saída.");
    const a = Number(kmSaida), b = Number(kmVolta);
    if (!Number.isFinite(a) || a < 0) return toast.error("KM de saída inválido.");
    if (!Number.isFinite(b) || b < 0) return toast.error("KM de volta inválido.");
    if (b < a) return toast.error("KM de volta não pode ser menor que KM de saída.");

    setSubmitting(true);
    try {
      const veiculoId = await ensureVeiculoByPlaca(placa, motorista.empresa_id ?? EMPRESA_PADRAO_ID);
      const entradaAt = combineDateTime(dataRef, horaEntrada);
      const saidaAt = resolveSaidaAt(entradaAt, dataRef, horaSaida);

      const { error } = await supabase.from("registros").insert({
        profile_id: user.id,
        motorista_id: motorista.id,
        empresa_id: motorista.empresa_id ?? EMPRESA_PADRAO_ID,
        posto_id: postoId,
        veiculo_id: veiculoId,
        data_referencia: dataRef,
        entrada_at: entradaAt,
        saida_at: saidaAt,
        km_saida: a,
        km_volta: b,
        observacao: observacao.trim() || null,
        status: "pendente",
      });

      if (error) {
        if (/registros_unico_motorista_data_veiculo|duplicate key/i.test(error.message)) {
          toast.error("Já existe um registro seu para essa placa nesta data.");
        } else if (/KM da volta/i.test(error.message)) {
          toast.error("KM da volta não pode ser menor que KM de saída.");
        } else if (/Hor[aá]rio de sa[ií]da/i.test(error.message)) {
          toast.error("Horário inválido. Verifique entrada e saída.");
        } else {
          toast.error("Não foi possível salvar. Tente novamente.");
        }
        setSubmitting(false);
        return;
      }
      toast.success("Registro salvo!");
      navigate("/app/sucesso", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar.");
      setSubmitting(false);
    }
  };

  if (loadingCtx) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  if (!motorista) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm">
        Sua conta de motorista ainda não está pronta. Atualize a página em alguns segundos. Se persistir, entre em contato com o administrador.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo registro</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados da sua jornada.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Posto</Label>
            <select
              value={postoId}
              onChange={(e) => setPostoId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione...</option>
              {postos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Placa do veículo</Label>
            <Input
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC1D23"
              maxLength={8}
              autoCapitalize="characters"
            />
          </div>
          <div className="space-y-1">
            <Label>Data de referência</Label>
            <Input type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} />
          </div>
          <div />
          <div className="space-y-1">
            <Label>Hora de entrada</Label>
            <Input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Hora de saída</Label>
            <Input type="time" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} />
            <p className="text-xs text-muted-foreground">Se a saída for no dia seguinte, o sistema reconhece automaticamente.</p>
          </div>
          <div className="space-y-1">
            <Label>KM saída</Label>
            <Input type="number" inputMode="numeric" min={0} value={kmSaida} onChange={(e) => setKmSaida(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>KM volta</Label>
            <Input type="number" inputMode="numeric" min={0} value={kmVolta} onChange={(e) => setKmVolta(e.target.value)} />
          </div>
        </div>

        {kmRodados !== null && (
          <div className={`rounded-md border px-3 py-2 text-sm ${kmRodados < 0 ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-primary/30 bg-accent text-accent-foreground"}`}>
            KM rodados: <b>{kmRodados}</b>
            {kmRodados < 0 && " — KM volta não pode ser menor que KM saída."}
          </div>
        )}

        <div className="space-y-1">
          <Label>Observação (opcional)</Label>
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} maxLength={500} />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar registro"}
        </Button>
      </form>
    </div>
  );
};

export default MotoristaNovoRegistro;
