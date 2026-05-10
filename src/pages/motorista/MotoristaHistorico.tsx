import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import type { RegistroStatus } from "@/lib/registros";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Lock, Image as ImageIcon } from "lucide-react";
import { podeMotoristaEditar, fotoPublicUrl, duracaoMinutos, formatDuracao } from "@/lib/registros";

type Foto = { foto_path: string };
type Row = {
  id: string;
  data_referencia: string;
  entrada_at: string;
  saida_at: string | null;
  km_saida: number;
  km_volta: number | null;
  km_rodados: number;
  status: RegistroStatus;
  created_at: string;
  veiculos: { placa: string } | null;
  registro_fotos: Foto[];
};

const MotoristaHistorico = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Meu histórico | Controle de BDT"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("registros")
        .select("id, data_referencia, entrada_at, saida_at, km_saida, km_volta, km_rodados, status, created_at, veiculos(placa), registro_fotos(foto_path)")
        .eq("profile_id", user.id)
        .order("data_referencia", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) toast.error("Erro ao carregar histórico.");
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meu histórico</h1>
          <p className="text-sm text-muted-foreground">{loading ? "Carregando..." : `${rows.length} registro(s)`}</p>
        </div>
        <Button asChild><Link to="/app/novo"><Plus className="mr-1 h-4 w-4" /> Nova saída</Link></Button>
      </div>

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="Sem registros ainda"
          description="Quando você finalizar seu primeiro BDT, ele aparecerá aqui."
          action={<Button asChild><Link to="/app/novo"><Plus className="mr-1 h-4 w-4" /> Iniciar saída</Link></Button>}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const editavel = podeMotoristaEditar(r.created_at);
            const dur = duracaoMinutos(r.entrada_at, r.saida_at);
            const fotos = r.registro_fotos ?? [];
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold">{formatDate(r.data_referencia)}</span>
                  <StatusBadge status={r.status} viewer="motorista" />
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-muted-foreground">Placa:</span> {r.veiculos?.placa ?? "—"}</div>
                  <div><span className="text-muted-foreground">Duração:</span> {formatDuracao(dur)}</div>
                  <div><span className="text-muted-foreground">Saída:</span> {formatDateTime(r.entrada_at)}</div>
                  <div><span className="text-muted-foreground">Retorno:</span> {r.saida_at ? formatDateTime(r.saida_at) : "—"}</div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">KM:</span> {formatNumber(r.km_saida)} → {r.km_volta != null ? formatNumber(r.km_volta) : "—"}
                    {r.km_volta != null && <> = <b>{formatNumber(r.km_rodados)}</b></>}
                  </div>
                </div>

                {fotos.length > 0 && (
                  <div className="mt-2 flex gap-1.5 overflow-x-auto">
                    {fotos.slice(0, 6).map((f, i) => (
                      <a key={i} href={fotoPublicUrl(f.foto_path) ?? "#"} target="_blank" rel="noopener noreferrer"
                        className="block h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border border-border">
                        <img src={fotoPublicUrl(f.foto_path) ?? ""} alt="" className="h-full w-full object-cover" />
                      </a>
                    ))}
                    {fotos.length > 6 && (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs text-muted-foreground">
                        <ImageIcon className="mr-1 h-3 w-3" /> +{fotos.length - 6}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-end">
                  {editavel ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/app/registros/${r.id}/editar`}><Pencil className="mr-1 h-3.5 w-3.5" /> Editar</Link>
                    </Button>
                  ) : (
                    <span className="inline-flex items-center text-xs text-muted-foreground">
                      <Lock className="mr-1 h-3 w-3" /> Edição disponível por até 24h.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MotoristaHistorico;
