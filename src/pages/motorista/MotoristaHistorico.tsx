import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Lock } from "lucide-react";
import { podeMotoristaEditar } from "@/lib/registros";

type Row = {
  id: string;
  data_referencia: string;
  entrada_at: string;
  saida_at: string;
  km_saida: number;
  km_volta: number;
  km_rodados: number;
  status: RegistroStatus;
  created_at: string;
  postos: { nome: string } | null;
  veiculos: { placa: string } | null;
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
        .select("id, data_referencia, entrada_at, saida_at, km_saida, km_volta, km_rodados, status, created_at, postos(nome), veiculos(placa)")
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
        <Button asChild><Link to="/app/novo"><Plus className="mr-1 h-4 w-4" /> Novo</Link></Button>
      </div>

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="Sem registros ainda"
          description="Quando você salvar seu primeiro registro, ele aparecerá aqui."
          action={<Button asChild><Link to="/app/novo"><Plus className="mr-1 h-4 w-4" /> Criar primeiro registro</Link></Button>}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {rows.map((r) => {
              const editavel = podeMotoristaEditar(r.created_at);
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold">{formatDate(r.data_referencia)}</span>
                    <StatusBadge status={r.status} viewer="motorista" />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div><span className="text-muted-foreground">Posto:</span> {r.postos?.nome ?? "—"}</div>
                    <div><span className="text-muted-foreground">Placa:</span> {r.veiculos?.placa ?? "—"}</div>
                    <div><span className="text-muted-foreground">Entrada:</span> {formatDateTime(r.entrada_at)}</div>
                    <div><span className="text-muted-foreground">Saída:</span> {formatDateTime(r.saida_at)}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Km:</span> {formatNumber(r.km_saida)} → {formatNumber(r.km_volta)} = <b>{formatNumber(r.km_rodados)}</b></div>
                  </div>
                  <div className="mt-2 flex items-center justify-end">
                    {editavel ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/app/registros/${r.id}/editar`}><Pencil className="mr-1 h-3.5 w-3.5" /> Editar</Link>
                      </Button>
                    ) : (
                      <span className="inline-flex items-center text-xs text-muted-foreground">
                        <Lock className="mr-1 h-3 w-3" /> Edição disponível por até 24h após o envio.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Posto</th>
                  <th className="px-4 py-2">Placa</th>
                  <th className="px-4 py-2">Entrada</th>
                  <th className="px-4 py-2">Saída</th>
                  <th className="px-4 py-2">Km saída</th>
                  <th className="px-4 py-2">Km volta</th>
                  <th className="px-4 py-2">Km rodados</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const editavel = podeMotoristaEditar(r.created_at);
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(r.data_referencia)}</td>
                      <td className="px-4 py-2">{r.postos?.nome ?? "—"}</td>
                      <td className="px-4 py-2">{r.veiculos?.placa ?? "—"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(r.entrada_at)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(r.saida_at)}</td>
                      <td className="px-4 py-2">{formatNumber(r.km_saida)}</td>
                      <td className="px-4 py-2">{formatNumber(r.km_volta)}</td>
                      <td className="px-4 py-2 font-medium">{formatNumber(r.km_rodados)}</td>
                      <td className="px-4 py-2"><StatusBadge status={r.status} viewer="motorista" /></td>
                      <td className="px-4 py-2 text-right">
                        {editavel ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/app/registros/${r.id}/editar`}><Pencil className="mr-1 h-3.5 w-3.5" /> Editar</Link>
                          </Button>
                        ) : (
                          <span className="inline-flex items-center text-xs text-muted-foreground">
                            <Lock className="mr-1 h-3 w-3" /> 24h
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default MotoristaHistorico;
