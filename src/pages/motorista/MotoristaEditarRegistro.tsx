import { useEffect, useMemo, useState, FormEvent, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import {
  EMPRESA_PADRAO_ID,
  ensureVeiculoByPlaca,
  combineDateTime,
  resolveSaidaAt,
  normalizePlaca,
  isPlacaValida,
  uploadFotoRegistro,
  podeMotoristaEditar,
  fotoPublicUrl,
} from "@/lib/registros";

type Posto = { id: string; nome: string };

const hhmmFromIso = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const MotoristaEditarRegistro = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [postos, setPostos] = useState<Posto[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string>(EMPRESA_PADRAO_ID);
  const [createdAt, setCreatedAt] = useState<string>("");

  const [dataRef, setDataRef] = useState("");
  const [kmSaida, setKmSaida] = useState("");
  const [kmVolta, setKmVolta] = useState("");
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSaida, setHoraSaida] = useState("");
  const [postoId, setPostoId] = useState("");
  const [placa, setPlaca] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotoPathExistente, setFotoPathExistente] = useState<string | null>(null);
  const [fotoNova, setFotoNova] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Editar registro | Controle de BDT"; }, []);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [r, p] = await Promise.all([
        supabase
          .from("registros")
          .select("id, data_referencia, entrada_at, saida_at, km_saida, km_volta, observacao, posto_id, empresa_id, foto_path, created_at, profile_id, veiculos(placa)")
          .eq("id", id)
          .maybeSingle(),
        supabase.from("postos").select("id, nome").eq("status", "ativo").order("nome"),
      ]);

      const reg: any = r.data;
      if (!reg) { toast.error("Registro não encontrado."); navigate("/app/historico", { replace: true }); return; }
      if (reg.profile_id !== user.id) { toast.error("Você não pode editar este registro."); navigate("/app/historico", { replace: true }); return; }
      if (!podeMotoristaEditar(reg.created_at)) {
        toast.error("Prazo de edição (24h) expirou.");
        navigate("/app/historico", { replace: true });
        return;
      }

      setPostos((p.data as any) ?? []);
      setEmpresaId(reg.empresa_id ?? EMPRESA_PADRAO_ID);
      setCreatedAt(reg.created_at);
      setDataRef(reg.data_referencia);
      setKmSaida(String(reg.km_saida));
      setKmVolta(String(reg.km_volta));
      setHoraEntrada(hhmmFromIso(reg.entrada_at));
      setHoraSaida(hhmmFromIso(reg.saida_at));
      setPostoId(reg.posto_id);
      setPlaca(reg.veiculos?.placa ?? "");
      setObservacao(reg.observacao ?? "");
      setFotoPathExistente(reg.foto_path ?? null);
      setLoading(false);
    })();
  }, [user, id, navigate]);

  const kmRodados = useMemo(() => {
    const a = Number(kmSaida); const b = Number(kmVolta);
    if (!Number.isFinite(a) || !Number.isFinite(b) || kmSaida === "" || kmVolta === "") return null;
    return b - a;
  }, [kmSaida, kmVolta]);

  const onPickFoto = (file: File | null) => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    if (!file) { setFotoNova(null); setFotoPreview(null); return; }
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem.");
    if (file.size > 8 * 1024 * 1024) return toast.error("A imagem precisa ter até 8 MB.");
    setFotoNova(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !user || !id) return;
    if (!createdAt || !podeMotoristaEditar(createdAt)) {
      return toast.error("Prazo de edição (24h) expirou.");
    }

    const a = Number(kmSaida), b = Number(kmVolta);
    if (kmSaida === "" || !Number.isFinite(a) || a < 0) return toast.error("KM inicial inválido.");
    if (kmVolta === "" || !Number.isFinite(b) || b < 0) return toast.error("KM final inválido.");
    if (b < a) return toast.error("O KM final não pode ser menor que o KM inicial.");
    if (!horaEntrada || !horaSaida) return toast.error("Informe entrada e saída.");
    if (!postoId) return toast.error("Selecione o posto.");
    if (!isPlacaValida(placa)) return toast.error("Placa inválida.");

    setSubmitting(true);
    try {
      const veiculoId = await ensureVeiculoByPlaca(placa, empresaId);
      const entradaAt = combineDateTime(dataRef, horaEntrada);
      const saidaAt = resolveSaidaAt(entradaAt, dataRef, horaSaida);

      let fotoPath: string | null = fotoPathExistente;
      if (fotoNova) {
        try {
          fotoPath = await uploadFotoRegistro(user.id, fotoNova);
        } catch {
          toast.warning("Não foi possível atualizar a foto. As demais alterações serão salvas.");
        }
      }

      const { error } = await supabase.from("registros").update({
        data_referencia: dataRef,
        entrada_at: entradaAt,
        saida_at: saidaAt,
        km_saida: a,
        km_volta: b,
        posto_id: postoId,
        veiculo_id: veiculoId,
        observacao: observacao.trim() || null,
        foto_path: fotoPath,
      }).eq("id", id);

      if (error) {
        toast.error("Não foi possível salvar a edição.");
        setSubmitting(false);
        return;
      }
      toast.success("Registro atualizado.");
      navigate("/app/historico", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar.");
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const kmInvalido = kmRodados !== null && kmRodados < 0;
  const fotoExistenteUrl = fotoPathExistente && !fotoNova ? fotoPublicUrl(fotoPathExistente) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar registro</h1>
          <p className="text-sm text-muted-foreground">Edição disponível por até 24 horas após o envio.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <Field label="Data" required><Input type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} required /></Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="KM inicial" required>
            <Input type="number" inputMode="numeric" min={0} value={kmSaida} onChange={(e) => setKmSaida(e.target.value)} required />
          </Field>
          <Field label="KM final" required>
            <Input type="number" inputMode="numeric" min={0} value={kmVolta} onChange={(e) => setKmVolta(e.target.value)} required />
          </Field>
        </div>

        <div className={`rounded-xl border-2 px-4 py-3 text-center ${kmRodados === null ? "border-dashed border-border bg-muted/30 text-muted-foreground" : kmInvalido ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-primary/40 bg-primary/5"}`}>
          <p className="text-xs uppercase tracking-wide">KM rodados</p>
          <p className="mt-0.5 text-3xl font-bold">{kmRodados === null ? "—" : kmRodados}</p>
          {kmInvalido && <p className="mt-1 text-xs">O KM final não pode ser menor que o KM inicial.</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hora de entrada" required><Input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} required /></Field>
          <Field label="Hora de saída" required><Input type="time" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} required /></Field>
        </div>

        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Empresa: <span className="font-semibold text-foreground">ASERP</span>
          <span className="mx-2">·</span>
          Posto: <span className="font-semibold text-foreground">SMSUB</span>
        </div>

        <Field label="Placa do veículo" required>
          <Input
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            onBlur={() => setPlaca((v) => normalizePlaca(v))}
            maxLength={8}
            className="uppercase tracking-wider"
            required
          />
        </Field>

        <Field label="Observação (opcional)">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} maxLength={500} />
        </Field>

        <Field label="Foto (opcional)">
          <input
            ref={fotoInputRef}
            type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => onPickFoto(e.target.files?.[0] ?? null)}
          />
          {fotoPreview ? (
            <div className="relative overflow-hidden rounded-lg border border-border">
              <img src={fotoPreview} alt="Nova foto" className="max-h-64 w-full object-cover" />
              <button type="button" onClick={() => onPickFoto(null)} className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow" aria-label="Remover">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : fotoExistenteUrl ? (
            <div className="space-y-2">
              <img src={fotoExistenteUrl} alt="Foto atual" className="max-h-64 w-full rounded-lg border border-border object-cover" />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fotoInputRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" /> Substituir foto
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setFotoPathExistente(null)} className="text-destructive">
                  <X className="mr-2 h-4 w-4" /> Remover foto
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => fotoInputRef.current?.click()} className="w-full">
              <Camera className="mr-2 h-4 w-4" /> Adicionar foto
            </Button>
          )}
        </Field>

        <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={submitting || kmInvalido}>
          {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar alterações"}
        </Button>
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
