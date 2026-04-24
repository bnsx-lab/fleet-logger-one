import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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
  /** Como exibir cada linha na tabela */
  renderRow: (row: T) => ReactNode[];
  columnHeaders: string[];
  /** Para popular dropdowns (ex.: empresa_id em postos/veiculos) */
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

  useEffect(() => { document.title = `${title} | Admin`; }, [title]);

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
    toast.success(`Atualizado para ${next}.`);
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
      if (/duplicate|unique/i.test(error.message)) toast.error("Já existe um registro com esses dados.");
      else toast.error("Erro ao salvar.");
      return;
    }
    toast.success(isEdit ? "Atualizado." : "Criado.");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Button onClick={() => setEditing({} as Partial<T>)}><Plus className="mr-1 h-4 w-4" /> Novo</Button>
        </div>
      </div>

      {!loading && filtered.length === 0 ? (
        <EmptyState title="Nada por aqui" description="Crie o primeiro item clicando em 'Novo'." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                {columnHeaders.map((h) => <th key={h} className="px-4 py-2">{h}</th>)}
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  {renderRow(r).map((cell, i) => <td key={i} className="px-4 py-2">{cell}</td>)}
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "ativo" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(r as any)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => onToggleStatus(r)}>
                        {r.status === "ativo" ? "Inativar" : "Ativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">{(editing as any).id ? "Editar" : "Novo"}</h2>
            <div className="space-y-3">
              {fields.map((f) => {
                const value = (editing as any)[f.name] ?? "";
                if (f.type === "select") {
                  const opts = f.options ?? options[f.name] ?? [];
                  return (
                    <div key={f.name}>
                      <Label>{f.label}{f.required && " *"}</Label>
                      <select
                        value={value}
                        onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value } as any)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Selecione...</option>
                        {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                    </div>
                  );
                }
                return (
                  <div key={f.name}>
                    <Label>{f.label}{f.required && " *"}</Label>
                    <Input
                      value={value}
                      maxLength={f.maxLength}
                      onChange={(e) => setEditing({ ...editing, [f.name]: f.uppercase ? e.target.value.toUpperCase() : e.target.value } as any)}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={onSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
