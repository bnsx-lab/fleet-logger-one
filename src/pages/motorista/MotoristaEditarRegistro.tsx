import { useEffect, useMemo, useState, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MultiPhotoUpload } from "@/components/MultiPhotoUpload";
import {
  EMPRESA_PADRAO_ID, ensureVeiculoByPlaca, combineDateTime, resolveSaidaAt,
  normalizePlaca, isPlacaValida, uploadFotosRegistro,
  podeMotoristaEditar, fotoPublicUrl, listarFotosDoRegistro, removerFoto,
  type FotoRegistro,
} from "@/lib/registros";

const hhmmFromIso = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const MotoristaEditarRegistro = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState(EMPRESA_PADRAO_ID);
  const [createdAt, setCreatedAt] = useState("");
  const [statusAtual, setStatusAtual] = useState<string>("rascunho");

  const [dataRef, setDataRef] = useState("");
  const [kmSaida, setKmSaida] = useState("");
  const [kmVolta, setKmVolta] = useState("");
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSaida, setHoraSaida] = useState("");
  const [placa, setPlaca] = useState("");
  const [observacao, setObservacao] = useState("");

  const [fotosExistentes, setFotosExistentes] = useState<FotoRegistro[]>([]);
  const [fotoLegada, setFotoLegada] = useState<string | null>(null);
  const [fotosNovas, setFotosNovas] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Editar BDT | Controle de BDT"; }, []);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: r } = await supabase.from("registros")
        .select("id, status, data_referencia, entrada_at, saida_at, km_saida, km_volta, observacao, empresa_id, foto_path, created_at, profile_id, veiculos(placa)")
        .eq("id", id).maybeSingle();
      const reg: any = r;
      if (!reg) { toast.error("Registro não encontrado."); navigate("/app/historico", { replace: true }); return; }
      if (reg.profile_id !== user.id) { toast.error("Sem permissão."); navigate("/app/historico", { replace: true }); return; }
      if (!podeMotoristaEditar(reg.created_at)) {
        toast.error("Prazo de edição (24h) expirou.");
        navigate("/app/historico", { replace: true });
        return;
      }
      setEmpresaId(reg.empresa_id ?? EMPRESA_PADRAO_ID);
      setCreatedAt(reg.created_at);
      setStatusAtual(reg.status);
      setDataRef(reg.data_referencia);
      setKmSaida(String(reg.km_saida));
      setKmVolta(reg.km_volta != null ? String(reg.km_volta) : "");
      setHoraEntrada(hhmmFromIso(reg.entrada_at));
      setHoraSaida(hhmmFromIso(reg.saida_at));
      setPlaca(reg.veiculos?.placa ?? "");
      setObservacao(reg.observacao ?? "");
      setFotoLegada(reg.foto_path ?? null);
      const fs = await listarFotosDoRegistro(id);
      setFotosExistentes(fs);
      setLoading(false);
    })();
  }, [user, id, navigate]);

  const kmRodados = useMemo(() => {
    const a = Number(kmSaida); const b = Number(kmVolta);
    if (!Number.isFinite(a) || !Number.isFinite(b) || kmSaida === "" || kmVolta === "") return null;
    return b - a;
  }, [kmSaida, kmVolta]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !user || !id) return;
    if (!createdAt || !podeMotoristaEditar(createdAt)) return toast.error("Prazo de edição (24h) expirou.");
    const a = Number(kmSaida);
    if (kmSaida === "" || !Number.isFinite(a) || a < 0) return toast.error("KM inicial inválido.");
    if (!horaEntrada) return toast.error("Informe a hora de saída.");
    if (!isPlacaValida(placa)) return toast.error("Placa inválida.");

    const temVolta = kmVolta !== "";
    const b = temVolta ? Number(kmVolta) : null;
    if (temVolta) {
      if (!Number.isFinite(b!) || (b as number) < 0) return toast.error("KM final inválido.");
      if ((b as number) < a) return toast.error("KM final não pode ser menor que o KM inicial.");
      if (!horaSaida) return toast.error("Informe a hora de retorno.");
    }

    setSubmitting(true);
    try {
      const veiculoId = await ensureVeiculoByPlaca(placa, empresaId);
      const entradaAt = combineDateTime(dataRef, horaEntrada);
      const saidaAt = temVolta && horaSaida ? resolveSaidaAt(entradaAt, dataRef, horaSaida) : null;

      const { error } = await supabase.from("registros").update({
        data_referencia: dataRef,
        entrada_at: entradaAt,
        saida_at: saidaAt,
        km_saida: a,
        km_volta: b,
        veiculo_id: veiculoId,
        observacao: observacao.trim() || null,
      } as any).eq("id", id);

      if (error) { toast.error("Não foi possível salvar."); setSubmitting(false); return; }
      if (fotosNovas.length > 0) await uploadFotosRegistro(user.id, id, fotosNovas);
      toast.success("Registro atualizado.");
      navigate("/app/historico", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar.");
      setSubmitting(false);
    }
  };

  const removerFotoExistente = async (fid: string) => {
    if (!confirm("Remover esta foto?")) return;
    try {
      await removerFoto(fid);
      setFotosExistentes((arr) => arr.filter((f) => f.id !== fid));
    } catch {
      toast.error("Não foi possível remover.");
    }
  };

  if (loading) return <LoadingScreen />;
  const kmInvalido = kmRodados !== null && kmRodados < 0;
  const fotoLegadaUrl = fotoLegada ? fotoPublicUrl(fotoLegada) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24 md:pb-0">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar BDT</h1>
          <p className="text-sm text-muted-foreground">Status: {statusAtual} · Edição até 24h após criação.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <Field label="Data" required>
          <Input type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} required />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="KM inicial" required>
            <Input type="number" inputMode="numeric" min={0} value={kmSaida} onChange={(e) => setKmSaida(e.target.value)} required />
          </Field>
          <Field label="KM final (opcional se em andamento)">
            <Input type="number" inputMode="numeric" min={0} value={kmVolta} onChange={(e) => setKmVolta(e.target.value)} />
          </Field>
        </div>

        <div className={`rounded-xl border-2 px-4 py-3 text-center ${
          kmRodados === null ? "border-dashed border-border bg-muted/30 text-muted-foreground"
            : kmInvalido ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-primary/40 bg-primary/5"
        }`}>
          <p className="text-xs uppercase tracking-wide">KM rodados</p>
          <p className="mt-0.5 text-3xl font-bold">{kmRodados === null ? "—" : kmRodados}</p>
          {kmInvalido && <p className="mt-1 text-xs">KM final menor que o KM inicial.</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hora de saída" required>
            <Input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} required />
          </Field>
          <Field label="Hora de retorno">
            <Input type="time" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Empresa: <span className="font-semibold text-foreground">ASERP</span>
          <span className="mx-2">·</span>
          Posto: <span className="font-semibold text-foreground">SMSUB</span>
        </div>

        <Field label="Placa do veículo" required>
          <Input value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            onBlur={() => setPlaca((v) => normalizePlaca(v))}
            maxLength={8} className="uppercase tracking-wider" required />
        </Field>

        <Field label="Observação (opcional)">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} maxLength={500} />
        </Field>

        {(fotosExistentes.length > 0 || fotoLegadaUrl) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Fotos já enviadas</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotoLegadaUrl && (
                <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={fotoLegadaUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              {fotosExistentes.map((f) => (
                <div key={f.id} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={fotoPublicUrl(f.foto_path) ?? ""} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removerFotoExistente(f.id)}
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow hover:bg-background"
                    aria-label="Remover">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Field label="Adicionar mais fotos (opcional)">
          <MultiPhotoUpload value={fotosNovas} onChange={setFotosNovas} max={8} />
        </Field>

        <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-border bg-card p-4 md:static md:mx-0 md:mb-0 md:border-0 md:p-0">
          <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={submitting || kmInvalido}>
            {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">
      {label}{required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
    {children}
  </div>
);

export default MotoristaEditarRegistro;
