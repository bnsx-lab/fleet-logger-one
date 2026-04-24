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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filtered.length} usuário(s)`} · promova outros administradores aqui
          </p>
        </div>
        <Input
          placeholder="Buscar por nome ou e-mail"
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
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">E-mail</th>
                <th className="px-4 py-2">Perfis</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const userRoles = roles[p.id] ?? [];
                const isAdmin = userRoles.includes("admin");
                const isMe = p.id === user?.id;
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">
                      {p.nome || "—"} {isMe && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}
                    </td>
                    <td className="px-4 py-2">{p.email}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {userRoles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : userRoles.map((r) => (
                          <span
                            key={r}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              r === "admin"
                                ? "bg-primary/15 text-primary"
                                : "bg-accent text-accent-foreground"
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          p.status === "ativo" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {isAdmin ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy === p.id || isMe}
                            onClick={() => demote(p.id)}
                            title={isMe ? "Você não pode remover seu próprio acesso" : ""}
                          >
                            <ShieldOff className="mr-1 h-4 w-4" /> Remover admin
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy === p.id}
                            onClick={() => promote(p.id)}
                          >
                            <ShieldCheck className="mr-1 h-4 w-4" /> Promover a admin
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy === p.id || isMe}
                          onClick={() => toggleStatus(p)}
                          title={isMe ? "Você não pode inativar a si mesmo" : ""}
                        >
                          <Power className="mr-1 h-4 w-4" />
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
      )}
    </div>
  );
};

export default AdminUsuarios;
