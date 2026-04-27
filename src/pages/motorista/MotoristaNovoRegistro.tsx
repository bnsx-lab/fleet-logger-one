import { useEffect, useMemo, useState, FormEvent, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import {
  EMPRESA_PADRAO_ID,
  POSTO_PADRAO_ID,
  ensureVeiculoByPlaca,
  combineDateTime,
  resolveSaidaAt,
  normalizePlaca,
  isPlacaValida,
  uploadFotoRegistro,
} from "@/lib/registros";

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
  const [loadingCtx, setLoadingCtx] = useState(true);

  // Ordem dos campos:
  // data → km inicial → km final → entrada → saída → placa → observação → foto
  // Posto é fixo (SMSUB) e exibido de forma discreta.
  const [dataRef, setDataRef] = useState(todayISO());
  const [kmSaida, setKmSaida] = useState("");
  const [kmVolta, setKmVolta] = useState("");
  const [horaEntrada, setHoraEntrada] = useState(nowHHMM());
  const [horaSaida, setHoraSaida] = useState("");
  const [placa, setPlaca] = useState("");
  const [observacao, setObservacao] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Novo registro | Controle de BDT"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("motoristas")
        .select("id, empresa_id, posto_principal_id")
        .eq("profile_id", user.id)
        .maybeSingle();
      setMotorista((data as any) ?? null);
      setLoadingCtx(false);
    })();
  }, [user]);

  const kmRodados = useMemo(() => {
    const a = Number(kmSaida);
    const b = Number(kmVolta);
    if (!Number.isFinite(a) || !Number.isFinite(b) || kmSaida === "" || kmVolta === "") return null;
    return b - a;
  }, [kmSaida, kmVolta]);

  const onPickFoto = (file: File | null) => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    if (!file) {
      setFoto(null);
      setFotoPreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("A imagem precisa ter até 8 MB.");
      return;
    }
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !user || !motorista) return;

    if (!dataRef) return toast.error("Informe a data de referência.");
    const a = Number(kmSaida), b = Number(kmVolta);
    if (kmSaida === "" || !Number.isFinite(a) || a < 0) return toast.error("Informe um KM inicial válido (não pode ser negativo).");
    if (kmVolta === "" || !Number.isFinite(b) || b < 0) return toast.error("Informe um KM final válido (não pode ser negativo).");
    if (b < a) return toast.error("O KM final não pode ser menor que o KM inicial.");
    if (!horaEntrada || !horaSaida) return toast.error("Informe hora de entrada e hora de saída.");
    if (!isPlacaValida(placa)) return toast.error("Informe uma placa válida (ex.: ABC1234 ou ABC1D23).");

    setSubmitting(true);
    try {
      const veiculoId = await ensureVeiculoByPlaca(placa, motorista.empresa_id ?? EMPRESA_PADRAO_ID);
      const entradaAt = combineDateTime(dataRef, horaEntrada);
      const saidaAt = resolveSaidaAt(entradaAt, dataRef, horaSaida);

      let fotoPath: string | null = null;
      if (foto) {
        try {
          fotoPath = await uploadFotoRegistro(user.id, foto);
        } catch (err: any) {
          toast.error("Não foi possível enviar a foto. O registro será salvo sem imagem.");
        }
      }

      const { error } = await supabase.from("registros").insert({
        profile_id: user.id,
        motorista_id: motorista.id,
        empresa_id: motorista.empresa_id ?? EMPRESA_PADRAO_ID,
        posto_id: motorista.posto_principal_id ?? POSTO_PADRAO_ID,
        veiculo_id: veiculoId,
        data_referencia: dataRef,
        entrada_at: entradaAt,
        saida_at: saidaAt,
        km_saida: a,
        km_volta: b,
        observacao: observacao.trim() || null,
        foto_path: fotoPath,
        status: "pendente",
      });

      if (error) {
        if (/registros_unico_motorista_data_veiculo|duplicate key/i.test(error.message)) {
          toast.error("Já existe um registro seu para essa placa nesta data.");
        } else if (/KM da volta/i.test(error.message)) {
          toast.error("O KM final não pode ser menor que o KM inicial.");
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

  const kmInvalido = kmRodados !== null && kmRodados < 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo BDT</h1>
          <p className="text-sm text-muted-foreground">Boletim Diário de Transporte — preencha os dados da jornada.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        {/* 1. Data */}
        <Field label="Data" required>
          <Input type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} required />
        </Field>

        {/* 2 & 3. KM inicial e final */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="KM inicial" required>
            <Input
              type="number" inputMode="numeric" min={0} step={1}
              value={kmSaida}
              onChange={(e) => setKmSaida(e.target.value)}
              placeholder="Ex.: 12345"
              required
            />
          </Field>
          <Field label="KM final" required>
            <Input
              type="number" inputMode="numeric" min={0} step={1}
              value={kmVolta}
              onChange={(e) => setKmVolta(e.target.value)}
              placeholder="Ex.: 12420"
              required
            />
          </Field>
        </div>

        {/* Destaque KM rodados */}
        <div
          className={`rounded-xl border-2 px-4 py-3 text-center transition-colors ${
            kmRodados === null
              ? "border-dashed border-border bg-muted/30 text-muted-foreground"
              : kmInvalido
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-primary/40 bg-primary/5"
          }`}
        >
          <p className="text-xs uppercase tracking-wide">KM rodados</p>
          <p className={`mt-0.5 text-3xl font-bold ${kmInvalido ? "" : "text-foreground"}`}>
            {kmRodados === null ? "—" : kmRodados}
          </p>
          {kmInvalido && (
            <p className="mt-1 text-xs">O KM final não pode ser menor que o KM inicial.</p>
          )}
        </div>

        {/* 4 & 5. Horários */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hora de entrada" required>
            <Input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} required />
          </Field>
          <Field label="Hora de saída" required hint="Se a saída for no dia seguinte (turno noturno), o sistema reconhece automaticamente.">
            <Input type="time" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} required />
          </Field>
        </div>

        {/* Posto fixo (ASERP · SMSUB) — discreto */}
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Empresa: <span className="font-semibold text-foreground">ASERP</span>
          <span className="mx-2">·</span>
          Posto: <span className="font-semibold text-foreground">SMSUB</span>
        </div>

        {/* 7. Placa */}
        <Field label="Placa do veículo" required hint="Aceita placa antiga (ABC1234) ou Mercosul (ABC1D23). Pode digitar com ou sem hífen.">
          <Input
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            onBlur={() => setPlaca((v) => normalizePlaca(v))}
            placeholder="ABC1D23"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="uppercase tracking-wider"
            required
          />
        </Field>

        {/* 8. Observação opcional */}
        <Field label="Observação (opcional)">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} maxLength={500} placeholder="Algo relevante sobre essa jornada..." />
        </Field>

        {/* 9. Foto opcional */}
        <Field label="Foto (opcional)" hint="Você pode anexar uma foto do hodômetro ou comprovante. Salvar sem foto também é permitido.">
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPickFoto(e.target.files?.[0] ?? null)}
          />
          {!fotoPreview ? (
            <Button type="button" variant="outline" onClick={() => fotoInputRef.current?.click()} className="w-full">
              <Camera className="mr-2 h-4 w-4" /> Adicionar foto
            </Button>
          ) : (
            <div className="relative overflow-hidden rounded-lg border border-border">
              <img src={fotoPreview} alt="Pré-visualização" className="max-h-64 w-full object-cover" />
              <button
                type="button"
                onClick={() => onPickFoto(null)}
                className="absolute right-2 top-2 rounded-full bg-background/90 p-1 text-foreground shadow hover:bg-background"
                aria-label="Remover foto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </Field>

        <Button type="submit" className="h-12 w-full text-base font-semibold" size="lg" disabled={submitting || kmInvalido}>
          {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar registro"}
        </Button>
      </form>
    </div>
  );
};

const Field = ({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">
      {label}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export default MotoristaNovoRegistro;
