import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Power } from "lucide-react";

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

  useEffect(() => { document.title = "Usuários | Admin"; }, []);

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
      if (/duplicate|unique/i.test(error.message)) return toast.info("Este usuário já é administrador.");
      return toast.error("Erro ao promover.");
    }
    toast.success("Usuário promovido a administrador.");
    load();
  };

  const demote = async (userId: string) => {
    if (userId === user?.id) return toast.error("Você não pode remover seu próprio acesso de administrador.");
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
    toast.success(`Usuário ${next === "ativo" ? "ativado" : "inativado"}.`);
    load();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filtered.length} usuário${filtered.length !== 1 ? "s" : ""}`}
            <span className="hidden sm:inline"> · Gerencie acessos administrativos</span>
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
        <EmptyState title="Nenhum usuário" description="Quando alguém se cadastrar, aparecerá aqui." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">E-mail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perfis</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const userRoles = roles[p.id] ?? [];
                const isAdmin = userRoles.includes("admin");
                const isMe = p.id === user?.id;
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {p.nome || "—"} 
                      {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>}
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-[200px] truncate" title={p.email}>
                      {p.email}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {userRoles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : userRoles.map((r) => (
                          <span
                            key={r}
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                              r === "admin"
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                          >
                            {r === "admin" ? "Admin" : "Motorista"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          p.status === "ativo" 
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
                            : "border-slate-200 bg-slate-50 text-slate-600"
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
                            title={isMe ? "Você não pode remover seu próprio acesso" : ""}
                            className="gap-1.5"
                          >
                            <ShieldOff className="h-4 w-4" /> 
                            <span className="hidden sm:inline">Remover admin</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy === p.id}
                            onClick={() => promote(p.id)}
                            className="gap-1.5"
                          >
                            <ShieldCheck className="h-4 w-4" /> 
                            <span className="hidden sm:inline">Promover</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy === p.id || isMe}
                          onClick={() => toggleStatus(p)}
                          title={isMe ? "Você não pode inativar a si mesmo" : ""}
                          className={`gap-1.5 ${p.status === "ativo" ? "text-muted-foreground hover:text-destructive" : "text-emerald-600"}`}
                        >
                          <Power className="h-4 w-4" />
                          <span className="hidden sm:inline">{p.status === "ativo" ? "Inativar" : "Ativar"}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios;
