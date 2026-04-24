import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Power, Search, User } from "lucide-react";

type AppRole = "admin" | "motorista";
type Profile = {
  id: string;
  nome: string;
  email: string;
  status: "ativo" | "inativo";
  created_at: string;
};
type RoleRow = { user_id: string; role: AppRole };

const AdminUsuarios = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { document.title = "Usuarios | Controle de BDT"; }, []);

  const load = async () => {
    setLoading(true);
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("id, nome, email, status, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles((p.data as any) ?? []);
    const map: Record<string, AppRole[]> = {};
    ((r.data as RoleRow[]) ?? []).forEach((row) => {
      map[row.user_id] = [...(map[row.user_id] ?? []), row.role];
    });
    setRoles(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = profiles.filter((p) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return p.nome.toLowerCase().includes(s) || p.email.toLowerCase().includes(s);
  });

  const promote = async (userId: string) => {
    setBusy(userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    setBusy(null);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) return toast.info("Este usuario ja e administrador.");
      return toast.error("Erro ao promover.");
    }
    toast.success("Usuario promovido a administrador.");
    load();
  };

  const demote = async (userId: string) => {
    if (userId === user?.id) return toast.error("Voce nao pode remover seu proprio acesso de administrador.");
    setBusy(userId);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    setBusy(null);
    if (error) return toast.error("Erro ao remover.");
    toast.success("Acesso de administrador removido.");
    load();
  };

  const toggleStatus = async (p: Profile) => {
    const next = p.status === "ativo" ? "inativo" : "ativo";
    setBusy(p.id);
    const { error } = await supabase.from("profiles").update({ status: next }).eq("id", p.id);
    setBusy(null);
    if (error) return toast.error("Erro ao atualizar status.");
    toast.success(`Usuario ${next === "ativo" ? "ativado" : "inativado"}.`);
    load();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filtered.length} usuario(s)`} - gerencie acessos e permissoes
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
        <EmptyState title="Nenhum usuario" description="Quando alguem se cadastrar, aparecera aqui." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perfis</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => {
                  const userRoles = roles[p.id] ?? [];
                  const isAdmin = userRoles.includes("admin");
                  const isMe = p.id === user?.id;
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {p.nome || "-"}
                              {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(voce)</span>}
                            </p>
                            <p className="text-sm text-muted-foreground">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {userRoles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : userRoles.map((r) => (
                            <span
                              key={r}
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                r === "admin"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {r === "admin" ? "Administrador" : "Motorista"}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            p.status === "ativo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {p.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy === p.id || isMe}
                              onClick={() => demote(p.id)}
                              title={isMe ? "Voce nao pode remover seu proprio acesso" : ""}
                              className="gap-1.5"
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                              Remover admin
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy === p.id}
                              onClick={() => promote(p.id)}
                              className="gap-1.5"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Promover
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy === p.id || isMe}
                            onClick={() => toggleStatus(p)}
                            title={isMe ? "Voce nao pode inativar a si mesmo" : ""}
                            className="gap-1.5"
                          >
                            <Power className="h-3.5 w-3.5" />
                            {p.status === "ativo" ? "Inativar" : "Ativar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios;
