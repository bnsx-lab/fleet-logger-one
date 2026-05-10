import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, Filter, ExternalLink } from "lucide-react";
import { fotoPublicUrl } from "@/lib/registros";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { RegistroStatus } from "@/lib/registros";

type Foto = {
  id: string;
  foto_path: string;
  created_at: string;
  registros: {
    id: string; data_referencia: string; status: RegistroStatus;
    motoristas: { nome_exibicao: string } | null;
    veiculos: { placa: string } | null;
  } | null;
};

const PAGE = 60;

const AdminImagens = () => {
  const [rows, setRows] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Foto | null>(null);

  const [motoristaId, setMotoristaId] = useState("");
  const [placa, setPlaca] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [motoristas, setMotoristas] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => { document.title = "Imagens | Admin"; }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("motoristas").select("id, nome_exibicao").order("nome_exibicao");
      setMotoristas(((data as any) ?? []).map((m: any) => ({ id: m.id, nome: m.nome_exibicao })));
    })();
  }, []);

  const reload = async () => {
    setLoading(true);
    let q = supabase
      .from("registro_fotos")
      .select("id, foto_path, created_at, registros!inner(id, data_referencia, status, motoristas(nome_exibicao, id), veiculos(placa))")
      .order("created_at", { ascending: false })
      .limit(PAGE);
    if (motoristaId) q = q.eq("registros.motorista_id", motoristaId);
    if (placa) q = q.ilike("registros.veiculos.placa", `%${placa.toUpperCase()}%`);
    if (from) q = q.gte("registros.data_referencia", from);
    if (to) q = q.lte("registros.data_referencia", to);
    const { data } = await q;
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [motoristaId, placa, from, to]);

  const baixar = (f: Foto) => {
    const url = fotoPublicUrl(f.foto_path);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = `bdt-${f.registros?.data_referencia ?? "foto"}.jpg`;
    a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Imagens</h1>
        <p className="text-sm text-muted-foreground">Galeria de fotos enviadas nos BDTs.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" /> Filtros
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Motorista</Label>
            <select value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todos</option>
              {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Placa</Label>
            <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" className="uppercase" />
          </div>
          <div>
            <Label className="text-xs">Data inicial</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Data final</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhuma imagem encontrada" description="Ajuste os filtros ou aguarde novos envios." />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {rows.map((f) => {
            const url = fotoPublicUrl(f.foto_path);
            return (
              <button key={f.id} type="button" onClick={() => setOpen(f)}
                className="group block aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                {url && <img src={url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />}
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {open && (
            <div className="flex flex-col">
              <div className="bg-black">
                <img src={fotoPublicUrl(open.foto_path) ?? ""} alt="" className="max-h-[70vh] w-full object-contain" />
              </div>
              <div className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{open.registros?.motoristas?.nome_exibicao ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {open.registros?.data_referencia ? formatDate(open.registros.data_referencia) : ""} · {open.registros?.veiculos?.placa ?? "—"}
                    </p>
                  </div>
                  {open.registros && <StatusBadge status={open.registros.status} />}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => baixar(open)}>
                    <Download className="mr-2 h-4 w-4" /> Baixar
                  </Button>
                  {open.registros?.id && (
                    <Button size="sm" asChild>
                      <Link to={`/admin/registros/${open.registros.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" /> Ver registro
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminImagens;
