import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { Plus, Search, X, Pencil, Power } from "lucide-react";

type EntidadeStatus = "ativo" | "inativo";

type FieldDef = {
  name: string;
  label: string;
  required?: boolean;
  type?: "text" | "select";
  options?: { id: string; label: string }[];
  uppercase?: boolean;
  maxLength?: number;
};

type Props<T extends { id: string; status: EntidadeStatus }> = {
  title: string;
  table: "empresas" | "postos" | "veiculos";
  selectColumns: string;
  fields: FieldDef[];
  renderRow: (row: T) => ReactNode[];
  columnHeaders: string[];
  preload?: () => Promise<Record<string, { id: string; label: string }[]>>;
  searchAccessor?: (row: T) => string;
};

export function AdminEntidadeCRUD<T extends { id: string; status: EntidadeStatus } & Record<string, any>>(
  { title, table, selectColumns, fields, renderRow, columnHeaders, preload, searchAccessor }: Props<T>,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<Record<string, { id: string; label: string }[]>>({});

  useEffect(() => { document.title = `${title} | Controle de BDT`; }, [title]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from(table).select(selectColumns).order("nome", { ascending: true } as any);
    if (error) toast.error("Erro ao carregar.");
    setRows((data as any) ?? []);
    if (preload) setOptions(await preload());
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = rows.filter((r) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    if (searchAccessor) return searchAccessor(r).toLowerCase().includes(s);
    return JSON.stringify(r).toLowerCase().includes(s);
  });

  const onToggleStatus = async (r: T) => {
    const next: EntidadeStatus = r.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from(table).update({ status: next }).eq("id", r.id);
    if (error) return toast.error("Erro ao alterar status.");
    toast.success(`Item ${next === "ativo" ? "ativado" : "inativado"}.`);
    load();
  };

  const onSave = async () => {
    if (!editing) return;
    for (const f of fields) {
      const v = (editing as any)[f.name];
      if (f.required && (!v || String(v).trim() === "")) {
        return toast.error(`Informe ${f.label}.`);
      }
    }
    setSaving(true);
    const payload: any = {};
    for (const f of fields) {
      let v = (editing as any)[f.name];
      if (typeof v === "string") {
        v = v.trim();
        if (f.uppercase) v = v.toUpperCase();
      }
      payload[f.name] = v ?? null;
    }
    const isEdit = !!(editing as any).id;
    const op = isEdit
      ? supabase.from(table).update(payload).eq("id", (editing as any).id)
      : supabase.from(table).insert({ ...payload, status: "ativo" });
    const { error } = await op;
    setSaving(false);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) toast.error("Ja existe um registro com esses dados.");
      else toast.error("Erro ao salvar.");
      return;
    }
    toast.success(isEdit ? "Atualizado com sucesso." : "Criado com sucesso.");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filtered.length} item(ns) encontrado(s)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-xl pl-9"
            />
          </div>
          <Button onClick={() => setEditing({} as Partial<T>)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
      </div>

      {/* Tabela */}
      {!loading && filtered.length === 0 ? (
        <EmptyState title="Nada por aqui" description="Crie o primeiro item clicando em 'Novo'." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/60">
                <tr>
                  {columnHeaders.map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-muted/40">
                    {renderRow(r).map((cell, i) => <td key={i} className="px-4 py-3 text-foreground">{cell}</td>)}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.status === "ativo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {r.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(r as any)} className="gap-1.5">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onToggleStatus(r)} className="gap-1.5">
                          <Power className="h-3.5 w-3.5" />
                          {r.status === "ativo" ? "Inativar" : "Ativar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de edicao */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {(editing as any).id ? "Editar item" : "Novo item"}
              </h2>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {fields.map((f) => {
                const value = (editing as any)[f.name] ?? "";
                if (f.type === "select") {
                  const opts = f.options ?? options[f.name] ?? [];
                  return (
                    <div key={f.name} className="space-y-1.5">
                      <Label className="text-sm font-medium">{f.label}{f.required && " *"}</Label>
                      <select
                        value={value}
                        onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value } as any)}
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione...</option>
                        {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                    </div>
                  );
                }
                return (
                  <div key={f.name} className="space-y-1.5">
                    <Label className="text-sm font-medium">{f.label}{f.required && " *"}</Label>
                    <Input
                      value={value}
                      maxLength={f.maxLength}
                      onChange={(e) => setEditing({ ...editing, [f.name]: f.uppercase ? e.target.value.toUpperCase() : e.target.value } as any)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={onSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
