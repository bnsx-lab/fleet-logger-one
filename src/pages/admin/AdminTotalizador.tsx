import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { calcularTotaisPorPlaca, type TotalizadorRow } from "@/lib/registros";
import { formatNumber, formatDate } from "@/lib/format";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { exportPdf } from "@/lib/pdf";
import { Download, FileText, Filter } from "lucide-react";
import { toast } from "sonner";

const startOfMonth = () => {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const AdminTotalizador = () => {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [placa, setPlaca] = useState("");
  const [rows, setRows] = useState<TotalizadorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Totalizador por placa | Admin"; }, []);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await calcularTotaisPorPlaca({ from, to, placa: placa || undefined });
      setRows(data);
    } catch {
      toast.error("Erro ao calcular totalizador.");
    }
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [from, to, placa]);

  const cols = [
    { header: "Placa", accessor: (r: TotalizadorRow) => r.placa },
    { header: "KM total", accessor: (r: TotalizadorRow) => r.km_total },
    { header: "Saídas", accessor: (r: TotalizadorRow) => r.saidas },
    { header: "Média/dia (km)", accessor: (r: TotalizadorRow) => r.media_dia },
    { header: "Top motorista", accessor: (r: TotalizadorRow) => r.top_motorista },
    { header: "Última utilização", accessor: (r: TotalizadorRow) => r.ultima_utilizacao ? formatDate(r.ultima_utilizacao) : "—" },
  ];

  const onCsv = () => {
    if (rows.length === 0) return toast.info("Sem dados para exportar.");
    downloadCsv(`totalizador_${from}_a_${to}.csv`, buildCsv(rows, cols));
    toast.success("CSV exportado.");
  };
  const onPdf = () => {
    if (rows.length === 0) return toast.info("Sem dados para exportar.");
    exportPdf(`totalizador_${from}_a_${to}.pdf`, `Totalizador por placa (${from} a ${to})`, rows, cols);
    toast.success("PDF exportado.");
  };

  const totalGeralKm = rows.reduce((s, r) => s + r.km_total, 0);
  const totalGeralSaidas = rows.reduce((s, r) => s + r.saidas, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Totalizador por placa</h1>
          <p className="text-sm text-muted-foreground">Considera apenas BDTs finalizados/enviados.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button onClick={onCsv} variant="outline"><Download className="mr-2 h-4 w-4" /> CSV</Button>
          <Button onClick={onPdf} variant="outline"><FileText className="mr-2 h-4 w-4" /> PDF</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" /> Filtros
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Data inicial</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Data final</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Placa</Label>
            <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="Todas" className="uppercase" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Veículos" value={rows.length} />
        <Stat label="KM total" value={totalGeralKm} />
        <Stat label="Saídas" value={totalGeralSaidas} />
        <Stat label="Período" value={`${from.slice(5).replace("-", "/")} → ${to.slice(5).replace("-", "/")}`} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Sem dados no período" description="Ajuste os filtros ou aguarde novos BDTs finalizados." />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {rows.map((r) => (
              <div key={r.veiculo_id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.placa}</span>
                  <span className="text-sm font-bold text-primary">{formatNumber(r.km_total)} km</span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <div>Saídas: <span className="text-foreground">{r.saidas}</span></div>
                  <div>Média/dia: <span className="text-foreground">{formatNumber(r.media_dia)} km</span></div>
                  <div className="col-span-2">Top: <span className="text-foreground">{r.top_motorista}</span></div>
                  <div className="col-span-2">Último uso: <span className="text-foreground">{r.ultima_utilizacao ? formatDate(r.ultima_utilizacao) : "—"}</span></div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Placa</th>
                  <th className="px-4 py-2">KM total</th>
                  <th className="px-4 py-2">Saídas</th>
                  <th className="px-4 py-2">Média/dia</th>
                  <th className="px-4 py-2">Top motorista</th>
                  <th className="px-4 py-2">Última utilização</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.veiculo_id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2 font-semibold">{r.placa}</td>
                    <td className="px-4 py-2">{formatNumber(r.km_total)}</td>
                    <td className="px-4 py-2">{r.saidas}</td>
                    <td className="px-4 py-2">{formatNumber(r.media_dia)}</td>
                    <td className="px-4 py-2">{r.top_motorista}</td>
                    <td className="px-4 py-2">{r.ultima_utilizacao ? formatDate(r.ultima_utilizacao) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs uppercase text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-bold">{typeof value === "number" ? formatNumber(value) : value}</p>
  </div>
);

export default AdminTotalizador;
