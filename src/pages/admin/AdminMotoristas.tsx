import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";

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

  useEffect(() => { document.title = "Motoristas | Admin"; }, []);

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
    toast.success("Motorista atualizado.");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Motoristas</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filtered.length} motorista${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Input 
          placeholder="Buscar por nome ou e-mail..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="max-w-xs"
        />
      </div>

      {!loading && filtered.length === 0 ? (
        <EmptyState title="Nenhum motorista" description="Quando alguém se cadastrar, aparecerá aqui." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">E-mail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Matrícula</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{m.nome_exibicao}</td>
                  <td className="px-4 py-3 text-foreground max-w-[200px] truncate" title={m.profiles?.email}>
                    {m.profiles?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground">{m.empresas?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">{m.postos?.nome ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{m.matricula ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      m.status === "ativo" 
                        ? "border-success/30 bg-success/10 text-success" 
                        : "border-border bg-muted text-muted-foreground"
                    }`}>
                      {m.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(m)}>
                        Editar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onToggleStatus(m)}
                        className={m.status === "ativo" ? "text-muted-foreground hover:text-destructive" : "text-success"}
                      >
                        {m.status === "ativo" ? "Inativar" : "Ativar"}
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4" 
          onClick={() => setEditing(null)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-5 text-lg font-bold text-foreground">Editar motorista</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nome de exibição</Label>
                <Input 
                  value={editing.nome_exibicao} 
                  onChange={(e) => setEditing({ ...editing, nome_exibicao: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Matrícula</Label>
                <Input 
                  value={editing.matricula ?? ""} 
                  onChange={(e) => setEditing({ ...editing, matricula: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Empresa</Label>
                <select
                  value={editing.empresa_id}
                  onChange={(e) => setEditing({ ...editing, empresa_id: e.target.value, posto_principal_id: null })}
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {empresas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Posto principal</Label>
                <select
                  value={editing.posto_principal_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, posto_principal_id: e.target.value || null })}
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Nenhum</option>
                  {postos.filter(p => p.empresa_id === editing.empresa_id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={onSaveEdit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMotoristas;
