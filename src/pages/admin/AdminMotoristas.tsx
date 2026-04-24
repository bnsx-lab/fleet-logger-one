import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { Search, Pencil, Power, X, User } from "lucide-react";

type Empresa = { id: string; nome: string };
type Posto = { id: string; nome: string; empresa_id: string };
type Motorista = {
  id: string;
  nome_exibicao: string;
  matricula: string | null;
  status: "ativo" | "inativo";
  empresa_id: string;
  posto_principal_id: string | null;
  profile_id: string;
  empresas: { nome: string } | null;
  postos: { nome: string } | null;
  profiles: { email: string } | null;
};

const AdminMotoristas = () => {
  const [rows, setRows] = useState<Motorista[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Motorista | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Motoristas | Controle de BDT"; }, []);

  const load = async () => {
    setLoading(true);
    const [m, e, p] = await Promise.all([
      supabase.from("motoristas")
        .select("id, nome_exibicao, matricula, status, empresa_id, posto_principal_id, profile_id, empresas(nome), postos(nome), profiles(email)")
        .order("nome_exibicao"),
      supabase.from("empresas").select("id, nome").order("nome"),
      supabase.from("postos").select("id, nome, empresa_id").order("nome"),
    ]);
    setRows((m.data as any) ?? []);
    setEmpresas((e.data as any) ?? []);
    setPostos((p.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return r.nome_exibicao.toLowerCase().includes(s) || r.profiles?.email?.toLowerCase().includes(s);
  });

  const onToggleStatus = async (m: Motorista) => {
    const next = m.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from("motoristas").update({ status: next }).eq("id", m.id);
    if (error) return toast.error("Erro ao atualizar status.");
    toast.success(`Motorista ${next === "ativo" ? "ativado" : "inativado"}.`);
    load();
  };

  const onSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from("motoristas")
      .update({
        nome_exibicao: editing.nome_exibicao.trim(),
        matricula: editing.matricula?.trim() || null,
        empresa_id: editing.empresa_id,
        posto_principal_id: editing.posto_principal_id,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar.");
    toast.success("Motorista atualizado com sucesso.");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Motoristas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filtered.length} motorista(s) encontrado(s)`}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-xl pl-9"
          />
        </div>
      </div>

      {!loading && filtered.length === 0 ? (
        <EmptyState title="Nenhum motorista" description="Quando alguem se cadastrar, aparecera aqui." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motorista</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Posto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matricula</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{m.nome_exibicao}</p>
                          <p className="text-sm text-muted-foreground">{m.profiles?.email ?? "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.empresas?.nome ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.postos?.nome ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{m.matricula ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          m.status === "ativo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {m.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(m)} className="gap-1.5">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onToggleStatus(m)} className="gap-1.5">
                          <Power className="h-3.5 w-3.5" />
                          {m.status === "ativo" ? "Inativar" : "Ativar"}
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
              <h2 className="text-lg font-semibold text-foreground">Editar motorista</h2>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nome de exibicao</Label>
                <Input
                  value={editing.nome_exibicao}
                  onChange={(e) => setEditing({ ...editing, nome_exibicao: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Matricula</Label>
                <Input
                  value={editing.matricula ?? ""}
                  onChange={(e) => setEditing({ ...editing, matricula: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Empresa</Label>
                <select
                  value={editing.empresa_id}
                  onChange={(e) => setEditing({ ...editing, empresa_id: e.target.value, posto_principal_id: null })}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {empresas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Posto principal</Label>
                <select
                  value={editing.posto_principal_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, posto_principal_id: e.target.value || null })}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Nenhum</option>
                  {postos.filter(p => p.empresa_id === editing.empresa_id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={onSaveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMotoristas;
