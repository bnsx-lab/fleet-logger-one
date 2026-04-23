import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";

type Row = {
  id: string;
  data_referencia: string;
  entrada_at: string;
  saida_at: string;
  km_rodados: number;
  status: RegistroStatus;
  postos: { nome: string } | null;
  veiculos: { placa: string } | null;
};

const MotoristaHistorico = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Histórico"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("registros")
        .select("id, data_referencia, entrada_at, saida_at, km_rodados, status, postos(nome), veiculos(placa)")
        .order("data_referencia", { ascending: false })
        .limit(100);
      if (error) toast.error("Erro ao carregar histórico.");
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!rows.length) return <EmptyState title="Sem registros ainda" description="Seus registros aparecerão aqui." />;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Meu histórico</h1>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Posto</th>
              <th className="px-4 py-2">Placa</th>
              <th className="px-4 py-2">Km</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2">{formatDate(r.data_referencia)}</td>
                <td className="px-4 py-2">{r.postos?.nome ?? "—"}</td>
                <td className="px-4 py-2">{r.veiculos?.placa ?? "—"}</td>
                <td className="px-4 py-2">{formatNumber(r.km_rodados)}</td>
                <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MotoristaHistorico;
