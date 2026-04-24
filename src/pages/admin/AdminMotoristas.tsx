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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Motoristas</h1>
          <p className="text-sm text-muted-foreground">{loading ? "Carregando..." : `${filtered.length} motorista(s)`}</p>
        </div>
        <Input placeholder="Buscar por nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      {!loading && filtered.length === 0 ? (
        <EmptyState title="Nenhum motorista" description="Quando alguém se cadastrar, aparecerá aqui." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">E-mail</th>
                <th className="px-4 py-2">Empresa</th>
                <th className="px-4 py-2">Posto</th>
                <th className="px-4 py-2">Matrícula</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{m.nome_exibicao}</td>
                  <td className="px-4 py-2">{m.profiles?.email ?? "—"}</td>
                  <td className="px-4 py-2">{m.empresas?.nome ?? "—"}</td>
                  <td className="px-4 py-2">{m.postos?.nome ?? "—"}</td>
                  <td className="px-4 py-2">{m.matricula ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${m.status === "ativo" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(m)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => onToggleStatus(m)}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">Editar motorista</h2>
            <div className="space-y-3">
              <div>
                <Label>Nome de exibição</Label>
                <Input value={editing.nome_exibicao} onChange={(e) => setEditing({ ...editing, nome_exibicao: e.target.value })} />
              </div>
              <div>
                <Label>Matrícula</Label>
                <Input value={editing.matricula ?? ""} onChange={(e) => setEditing({ ...editing, matricula: e.target.value })} />
              </div>
              <div>
                <Label>Empresa</Label>
                <select
                  value={editing.empresa_id}
                  onChange={(e) => setEditing({ ...editing, empresa_id: e.target.value, posto_principal_id: null })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {empresas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>
              <div>
                <Label>Posto principal</Label>
                <select
                  value={editing.posto_principal_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, posto_principal_id: e.target.value || null })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">—</option>
                  {postos.filter(p => p.empresa_id === editing.empresa_id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={onSaveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMotoristas;
