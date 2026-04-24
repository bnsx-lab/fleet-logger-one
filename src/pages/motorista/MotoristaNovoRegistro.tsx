import { useEffect, useMemo, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Car, Calendar, Clock, Gauge, FileText, Check, AlertCircle } from "lucide-react";
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

  useEffect(() => { document.title = "Novo registro | Controle de BDT"; }, []);

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
    if (normalizePlaca(placa).length < 5) return toast.error("Informe uma placa valida.");
    if (!dataRef) return toast.error("Informe a data de referencia.");
    if (!horaEntrada || !horaSaida) return toast.error("Informe entrada e saida.");
    const a = Number(kmSaida), b = Number(kmVolta);
    if (!Number.isFinite(a) || a < 0) return toast.error("Odometro de saida invalido.");
    if (!Number.isFinite(b) || b < 0) return toast.error("Odometro de volta invalido.");
    if (b < a) return toast.error("O odometro de volta nao pode ser menor que o de saida.");

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
          toast.error("Ja existe um registro seu para essa placa nesta data.");
        } else if (/KM da volta/i.test(error.message)) {
          toast.error("Odometro de volta nao pode ser menor que o de saida.");
        } else if (/Hor[aá]rio de sa[ií]da/i.test(error.message)) {
          toast.error("Horario invalido. Verifique entrada e saida.");
        } else {
          toast.error("Nao foi possivel salvar. Tente novamente.");
        }
        setSubmitting(false);
        return;
      }
      toast.success("Registro salvo com sucesso!");
      navigate("/app/sucesso", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar.");
      setSubmitting(false);
    }
  };

  if (loadingCtx) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!motorista) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <AlertCircle className="h-6 w-6 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold">Conta em configuracao</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta de motorista ainda esta sendo configurada. Atualize a pagina em alguns segundos ou entre em contato com o administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Novo registro</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados da sua jornada</p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        
        {/* Secao: Local e Veiculo */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Local e veiculo
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Posto de trabalho</Label>
              <select
                value={postoId}
                onChange={(e) => setPostoId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione o posto...</option>
                {postos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Placa do veiculo</Label>
              <div className="relative">
                <Car className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  placeholder="ABC1D23"
                  maxLength={8}
                  autoCapitalize="characters"
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Secao: Data e Horarios */}
        <div className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-4 w-4" />
            Data e horarios
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data de referencia</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={dataRef}
                  onChange={(e) => setDataRef(e.target.value)}
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Horario de entrada</Label>
              <Input
                type="time"
                value={horaEntrada}
                onChange={(e) => setHoraEntrada(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Horario de saida</Label>
              <Input
                type="time"
                value={horaSaida}
                onChange={(e) => setHoraSaida(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Saida no dia seguinte e reconhecida automaticamente
              </p>
            </div>
          </div>
        </div>

        {/* Secao: Odometro */}
        <div className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Gauge className="h-4 w-4" />
            Quilometragem
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Odometro na saida</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={kmSaida}
                onChange={(e) => setKmSaida(e.target.value)}
                placeholder="Ex: 45230"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Odometro na volta</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={kmVolta}
                onChange={(e) => setKmVolta(e.target.value)}
                placeholder="Ex: 45380"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Resultado KM Rodados */}
          {kmRodados !== null && (
            <div
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                kmRodados < 0
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              <div className="flex items-center gap-2">
                {kmRodados >= 0 ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">
                  {kmRodados >= 0 ? "Distancia percorrida" : "Valor invalido"}
                </span>
              </div>
              <span className="text-lg font-bold">
                {kmRodados >= 0 ? `${kmRodados} km` : "Verifique os valores"}
              </span>
            </div>
          )}
        </div>

        {/* Secao: Observacao */}
        <div className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-4 w-4" />
            Observacao
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Anotacoes adicionais (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Descreva qualquer ocorrencia ou informacao relevante..."
              className="min-h-[100px] resize-none rounded-xl"
            />
          </div>
        </div>

        {/* Botao de Submit */}
        <Button
          type="submit"
          className="h-12 w-full gap-2 text-base font-semibold shadow-md"
          disabled={submitting || (kmRodados !== null && kmRodados < 0)}
        >
          {submitting ? "Salvando..." : "Salvar registro"}
          {!submitting && <Check className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
};

export default MotoristaNovoRegistro;
