import { useEffect, useState } from "react";
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
import { Download, Filter, FileText, ChevronLeft, ChevronRight, X } from "lucide-react";
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

  useEffect(() => { document.title = "Registros | Controle de BDT"; }, []);

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

  const hasFilters = motoristaId || empresaId || postoId || veiculoId || status || from || to;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Registros</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatNumber(count)} registro(s) encontrado(s)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onExportCsv} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={onExportPdf} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filtros
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">De</Label>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Ate</Label>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className="h-10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhum registro encontrado" description="Ajuste os filtros ou aguarde novos registros." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motorista</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Posto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placa</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Km rodados</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-muted/40">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{formatDate(r.data_referencia)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/registros/${r.id}`} className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline">
                          {r.motoristas?.nome_exibicao ?? "-"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.empresas?.nome ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.postos?.nome ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{r.veiculos?.placa ?? "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">{formatNumber(r.km_rodados)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Paginacao */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Pagina <span className="font-semibold text-foreground">{page + 1}</span> de <span className="font-semibold text-foreground">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1">
                Proxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: OptList }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium">{label}</Label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">Todos</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  </div>
);

export default AdminRegistros;
