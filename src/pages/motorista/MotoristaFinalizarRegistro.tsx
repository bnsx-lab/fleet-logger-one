import { useEffect, useMemo, useState, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MultiPhotoUpload } from "@/components/MultiPhotoUpload";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  combineDateTime, resolveSaidaAt, uploadFotosRegistro, formatDuracao, duracaoMinutos,
} from "@/lib/registros";
import { formatDateTime, formatNumber } from "@/lib/format";

type Reg = {
  id: string; data_referencia: string; entrada_at: string;
  km_saida: number; observacao: string | null; status: string;
  profile_id: string;
  veiculos: { placa: string } | null;
};

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const MotoristaFinalizarRegistro = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [reg, setReg] = useState<Reg | null>(null);
  const [loading, setLoading] = useState(true);

  const [kmVolta, setKmVolta] = useState("");
  const [horaSaida, setHoraSaida] = useState(nowHHMM());
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Finalizar saída | Controle de BDT"; }, []);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from("registros")
        .select("id, data_referencia, entrada_at, km_saida, observacao, status, profile_id, veiculos(placa)")
        .eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Registro não encontrado."); navigate("/app/em-andamento", { replace: true }); return; }
      const r: any = data;
      if (r.profile_id !== user.id) { toast.error("Sem permissão."); navigate("/app/em-andamento", { replace: true }); return; }
      setReg(r);
      setObservacao(r.observacao ?? "");
      setLoading(false);
    })();
  }, [user, id, navigate]);

  const kmRodados = useMemo(() => {
    if (!reg) return null;
    const b = Number(kmVolta);
    if (kmVolta === "" || !Number.isFinite(b)) return null;
    return b - reg.km_saida;
  }, [kmVolta, reg]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !reg || !user) return;
    const b = Number(kmVolta);
    if (kmVolta === "" || !Number.isFinite(b) || b < 0) return toast.error("Informe um KM final válido.");
    if (b < reg.km_saida) return toast.error("KM final não pode ser menor que o KM inicial.");
    if (!horaSaida) return toast.error("Informe a hora de retorno.");

    setSubmitting(true);
    try {
      const saidaAt = resolveSaidaAt(reg.entrada_at, reg.data_referencia, horaSaida);
      const obsFinal = observacao.trim() || null;

      const { error } = await supabase.from("registros").update({
        km_volta: b, saida_at: saidaAt,
        observacao: obsFinal,
        status: "finalizado",
        enviado_at: new Date().toISOString(),
      } as any).eq("id", reg.id);

      if (error) {
        toast.error("Não foi possível finalizar.");
        setSubmitting(false);
        return;
      }
      if (fotos.length > 0) await uploadFotosRegistro(user.id, reg.id, fotos);
      toast.success("BDT finalizado!");
      navigate("/app/sucesso", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao finalizar.");
      setSubmitting(false);
    }
  };

  if (loading || !reg) return <LoadingScreen />;
  const dur = kmRodados !== null && horaSaida
    ? duracaoMinutos(reg.entrada_at, resolveSaidaAt(reg.entrada_at, reg.data_referencia, horaSaida))
    : null;
  const kmInvalido = kmRodados !== null && kmRodados < 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24 md:pb-0">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Finalizar saída</h1>
          <p className="text-sm text-muted-foreground">Etapa 2 de 2 — informe o KM final e a hora de retorno.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p className="text-xs uppercase text-muted-foreground">Saída registrada</p>
        <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
          <div><span className="text-muted-foreground">Placa:</span> <b>{reg.veiculos?.placa ?? "—"}</b></div>
          <div><span className="text-muted-foreground">KM inicial:</span> <b>{formatNumber(reg.km_saida)}</b></div>
          <div className="col-span-2"><span className="text-muted-foreground">Saiu em:</span> {formatDateTime(reg.entrada_at)}</div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="KM final" required>
            <Input type="number" inputMode="numeric" min={0} step={1} value={kmVolta}
              onChange={(e) => setKmVolta(e.target.value)} placeholder="Ex.: 12420" required />
          </Field>
          <Field label="Hora de retorno" required>
            <Input type="time" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} required />
          </Field>
        </div>

        <div className={`rounded-xl border-2 px-4 py-3 text-center ${
          kmRodados === null ? "border-dashed border-border bg-muted/30 text-muted-foreground"
            : kmInvalido ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-primary/40 bg-primary/5"
        }`}>
          <p className="text-xs uppercase tracking-wide">KM rodados</p>
          <p className="mt-0.5 text-3xl font-bold">{kmRodados === null ? "—" : kmRodados}</p>
          {dur != null && !kmInvalido && (
            <p className="mt-1 text-xs text-muted-foreground">Duração: {formatDuracao(dur)}</p>
          )}
          {kmInvalido && <p className="mt-1 text-xs">KM final menor que o KM inicial.</p>}
        </div>

        <Field label="Observação complementar (opcional)">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} maxLength={500} />
        </Field>

        <Field label="Mais fotos (opcional)" hint="Comprovantes ou fotos do retorno.">
          <MultiPhotoUpload value={fotos} onChange={setFotos} max={8} />
        </Field>

        <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-border bg-card p-4 md:static md:mx-0 md:mb-0 md:border-0 md:p-0">
          <Button type="submit" className="h-12 w-full text-base font-semibold" size="lg" disabled={submitting || kmInvalido}>
            {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizando...</>) : "Finalizar BDT"}
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

export default MotoristaFinalizarRegistro;
