import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, RegistroStatus } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { exportPdf } from "@/lib/pdf";
import { Download, Filter, FileText } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  data_referencia: string;
  entrada_at: string;
  saida_at: string;
  km_saida: number;
  km_volta: number;
  km_rodados: number;
  status: RegistroStatus;
  motoristas: { id: string; nome_exibicao: string } | null;
  empresas: { id: string; nome: string } | null;
  postos: { id: string; nome: string } | null;
  veiculos: { id: string; placa: string } | null;
};

type OptList = { id: string; label: string }[];

const PAGE_SIZE = 25;

const AdminRegistros = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // filtros
  const [motoristaId, setMotoristaId] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [postoId, setPostoId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // listas
  const [motoristas, setMotoristas] = useState<OptList>([]);
  const [empresas, setEmpresas] = useState<OptList>([]);
  const [postos, setPostos] = useState<OptList>([]);
  const [veiculos, setVeiculos] = useState<OptList>([]);

  useEffect(() => { document.title = "Registros | Admin"; }, []);

  useEffect(() => {
    (async () => {
      const [m, e, p, v] = await Promise.all([
        supabase.from("motoristas").select("id, nome_exibicao").order("nome_exibicao"),
        supabase.from("empresas").select("id, nome").order("nome"),
        supabase.from("postos").select("id, nome").order("nome"),
        supabase.from("veiculos").select("id, placa").order("placa"),
      ]);
      setMotoristas((m.data ?? []).map((x: any) => ({ id: x.id, label: x.nome_exibicao })));
      setEmpresas((e.data ?? []).map((x: any) => ({ id: x.id, label: x.nome })));
      setPostos((p.data ?? []).map((x: any) => ({ id: x.id, label: x.nome })));
      setVeiculos((v.data ?? []).map((x: any) => ({ id: x.id, label: x.placa })));
    })();
  }, []);

  const buildQuery = () => {
    let q = supabase
      .from("registros")
      .select(
        "id, data_referencia, entrada_at, saida_at, km_saida, km_volta, km_rodados, status, motoristas(id, nome_exibicao), empresas(id, nome), postos(id, nome), veiculos(id, placa)",
        { count: "exact" },
      )
      .order("data_referencia", { ascending: false })
      .order("created_at", { ascending: false });

    if (motoristaId) q = q.eq("motorista_id", motoristaId);
    if (empresaId) q = q.eq("empresa_id", empresaId);
    if (postoId) q = q.eq("posto_id", postoId);
    if (veiculoId) q = q.eq("veiculo_id", veiculoId);
    if (status) q = q.eq("status", status as RegistroStatus);
    if (from) q = q.gte("data_referencia", from);
    if (to) q = q.lte("data_referencia", to);
    return q;
  };

  const reload = async () => {
    setLoading(true);
    const q = buildQuery().range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count, error } = await q;
    if (error) toast.error("Erro ao carregar registros.");
    setRows((data as any) ?? []);
    setCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, motoristaId, empresaId, postoId, veiculoId, status, from, to]);

  // Realtime: novos registros do motorista chegam automaticamente
  useEffect(() => {
    const channel = supabase
      .channel("admin-registros-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "registros" }, () => {
        reload();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, motoristaId, empresaId, postoId, veiculoId, status, from, to]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const fetchAllForExport = async () => {
    const { data, error } = await buildQuery().limit(5000);
    if (error) { toast.error("Erro ao exportar."); return null; }
    return (data as any[]) ?? [];
  };

  const exportColumns = [
    { header: "Data", accessor: (r: any) => formatDate(r.data_referencia) },
    { header: "Entrada", accessor: (r: any) => formatDateTime(r.entrada_at) },
    { header: "Saída", accessor: (r: any) => formatDateTime(r.saida_at) },
    { header: "Motorista", accessor: (r: any) => r.motoristas?.nome_exibicao ?? "" },
    { header: "Empresa", accessor: (r: any) => r.empresas?.nome ?? "" },
    { header: "Posto", accessor: (r: any) => r.postos?.nome ?? "" },
    { header: "Placa", accessor: (r: any) => r.veiculos?.placa ?? "" },
    { header: "Km saída", accessor: (r: any) => r.km_saida },
    { header: "Km volta", accessor: (r: any) => r.km_volta },
    { header: "Km rodados", accessor: (r: any) => r.km_rodados },
    { header: "Status", accessor: (r: any) => r.status },
  ];

  const onExportCsv = async () => {
    const data = await fetchAllForExport();
    if (!data) return;
    if (data.length === 0) return toast.info("Sem dados para exportar.");
    const csv = buildCsv(data, exportColumns);
    downloadCsv(`registros_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success("CSV exportado.");
  };

  const onExportPdf = async () => {
    const data = await fetchAllForExport();
    if (!data) return;
    if (data.length === 0) return toast.info("Sem dados para exportar.");
    exportPdf(`registros_${new Date().toISOString().slice(0, 10)}.pdf`, "Relatório de Registros", data, exportColumns);
    toast.success("PDF exportado.");
  };

  const clearFilters = () => {
    setMotoristaId(""); setEmpresaId(""); setPostoId(""); setVeiculoId(""); setStatus(""); setFrom(""); setTo("");
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Registros</h1>
          <p className="text-sm text-muted-foreground">{formatNumber(count)} registro(s)</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button onClick={onExportCsv} variant="outline" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button onClick={onExportPdf} variant="outline" className="w-full sm:w-auto">
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" /> Filtros
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Motorista" value={motoristaId} onChange={setMotoristaId} options={motoristas} />
          <Select label="Empresa" value={empresaId} onChange={setEmpresaId} options={empresas} />
          <Select label="Posto" value={postoId} onChange={setPostoId} options={postos} />
          <Select label="Placa" value={veiculoId} onChange={setVeiculoId} options={veiculos} />
          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { id: "pendente", label: "Pendente" },
              { id: "revisado", label: "Revisado" },
              { id: "aprovado", label: "Aprovado" },
              { id: "corrigido", label: "Corrigido" },
              { id: "cancelado", label: "Cancelado" },
            ]}
          />
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" onClick={clearFilters} className="w-full">Limpar filtros</Button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhum registro encontrado" description="Ajuste os filtros ou aguarde novos registros." />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {rows.map((r) => (
              <Link
                key={r.id}
                to={`/admin/registros/${r.id}`}
                className="block rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold">{formatDate(r.data_referencia)}</span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="truncate text-sm font-medium text-primary">{r.motoristas?.nome_exibicao ?? "—"}</p>
                <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <div><span>Empresa:</span> <span className="text-foreground">{r.empresas?.nome ?? "—"}</span></div>
                  <div><span>Posto:</span> <span className="text-foreground">{r.postos?.nome ?? "—"}</span></div>
                  <div><span>Placa:</span> <span className="text-foreground">{r.veiculos?.placa ?? "—"}</span></div>
                  <div><span>Km rodados:</span> <span className="font-semibold text-foreground">{formatNumber(r.km_rodados)}</span></div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Motorista</th>
                  <th className="px-4 py-2">Empresa</th>
                  <th className="px-4 py-2">Posto</th>
                  <th className="px-4 py-2">Placa</th>
                  <th className="px-4 py-2">Km</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(r.data_referencia)}</td>
                    <td className="px-4 py-2">
                      <Link to={`/admin/registros/${r.id}`} className="font-medium text-primary hover:underline">
                        {r.motoristas?.nome_exibicao ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{r.empresas?.nome ?? "—"}</td>
                    <td className="px-4 py-2">{r.postos?.nome ?? "—"}</td>
                    <td className="px-4 py-2">{r.veiculos?.placa ?? "—"}</td>
                    <td className="px-4 py-2">{formatNumber(r.km_rodados)}</td>
                    <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: OptList }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">Todos</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  </div>
);

export default AdminRegistros;
