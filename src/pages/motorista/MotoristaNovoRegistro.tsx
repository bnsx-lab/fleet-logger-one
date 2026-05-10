import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { MultiPhotoUpload } from "@/components/MultiPhotoUpload";
import {
  EMPRESA_PADRAO_ID, POSTO_PADRAO_ID,
  ensureVeiculoByPlaca, combineDateTime,
  normalizePlaca, isPlacaValida, uploadFotosRegistro,
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

  const [dataRef, setDataRef] = useState(todayISO());
  const [kmSaida, setKmSaida] = useState("");
  const [horaEntrada, setHoraEntrada] = useState(nowHHMM());
  const [placa, setPlaca] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Iniciar saída | Controle de BDT"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("motoristas")
        .select("id, empresa_id, posto_principal_id")
        .eq("profile_id", user.id).maybeSingle();
      setMotorista((data as any) ?? null);
      setLoadingCtx(false);
    })();
  }, [user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !user || !motorista) return;
    const a = Number(kmSaida);
    if (!dataRef) return toast.error("Informe a data.");
    if (kmSaida === "" || !Number.isFinite(a) || a < 0) return toast.error("Informe um KM inicial válido.");
    if (!horaEntrada) return toast.error("Informe a hora de saída.");
    if (!isPlacaValida(placa)) return toast.error("Placa inválida (ex.: ABC1234 ou ABC1D23).");

    setSubmitting(true);
    try {
      const veiculoId = await ensureVeiculoByPlaca(placa, motorista.empresa_id ?? EMPRESA_PADRAO_ID);
      const entradaAt = combineDateTime(dataRef, horaEntrada);

      const { data: created, error } = await supabase.from("registros").insert({
        profile_id: user.id,
        motorista_id: motorista.id,
        empresa_id: motorista.empresa_id ?? EMPRESA_PADRAO_ID,
        posto_id: motorista.posto_principal_id ?? POSTO_PADRAO_ID,
        veiculo_id: veiculoId,
        data_referencia: dataRef,
        entrada_at: entradaAt,
        km_saida: a,
        observacao: observacao.trim() || null,
        status: "em_andamento",
      } as any).select("id").single();

      if (error || !created) {
        toast.error("Não foi possível iniciar a saída.");
        setSubmitting(false);
        return;
      }

      if (fotos.length > 0) {
        await uploadFotosRegistro(user.id, created.id, fotos);
      }
      toast.success("Saída iniciada!");
      navigate("/app/em-andamento", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao iniciar saída.");
      setSubmitting(false);
    }
  };

  if (loadingCtx) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!motorista) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm">
        Sua conta de motorista ainda não está pronta. Atualize a página em alguns segundos.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24 md:pb-0">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Iniciar saída</h1>
          <p className="text-sm text-muted-foreground">Etapa 1 de 2 — registre a saída agora; finalize ao retornar.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <Field label="Data" required>
          <Input type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} required />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="KM inicial" required>
            <Input type="number" inputMode="numeric" min={0} step={1} value={kmSaida}
              onChange={(e) => setKmSaida(e.target.value)} placeholder="Ex.: 12345" required />
          </Field>
          <Field label="Hora de saída" required>
            <Input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} required />
          </Field>
        </div>

        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Empresa: <span className="font-semibold text-foreground">ASERP</span>
          <span className="mx-2">·</span>
          Posto: <span className="font-semibold text-foreground">SMSUB</span>
        </div>

        <Field label="Placa do veículo" required hint="Aceita placa antiga (ABC1234) ou Mercosul (ABC1D23).">
          <Input value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            onBlur={() => setPlaca((v) => normalizePlaca(v))}
            placeholder="ABC1D23" maxLength={8}
            autoCapitalize="characters" autoCorrect="off" spellCheck={false}
            className="uppercase tracking-wider" required />
        </Field>

        <Field label="Observação (opcional)">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} maxLength={500}
            placeholder="Algo relevante sobre essa saída..." />
        </Field>

        <Field label="Fotos (opcional)" hint="Veículo, painel, documento, comprovante ou ocorrência.">
          <MultiPhotoUpload value={fotos} onChange={setFotos} max={8} />
        </Field>

        <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-border bg-card p-4 md:static md:mx-0 md:mb-0 md:border-0 md:p-0">
          <Button type="submit" className="h-12 w-full text-base font-semibold" size="lg" disabled={submitting}>
            {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Iniciar saída"}
          </Button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">
      {label}{required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export default MotoristaNovoRegistro;
