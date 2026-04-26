import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, CheckCircle2, Ban, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AppRole = "admin" | "motorista";
type Profile = {
  id: string;
  nome: string;
  email: string;
  status: "ativo" | "inativo";
  created_at: string;
};
type RoleRow = { user_id: string; role: AppRole };
type Tab = "todos" | "pendentes" | "ativos" | "admins";

const AdminUsuarios = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("pendentes");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);

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

  const counts = useMemo(() => {
    const c = { todos: profiles.length, pendentes: 0, ativos: 0, admins: 0 };
    for (const p of profiles) {
      if (p.status === "inativo") c.pendentes++;
      else c.ativos++;
      if ((roles[p.id] ?? []).includes("admin")) c.admins++;
    }
    return c;
  }, [profiles, roles]);

  const filtered = profiles.filter((p) => {
    const s = search.trim().toLowerCase();
    if (s && !(p.nome.toLowerCase().includes(s) || p.email.toLowerCase().includes(s))) return false;
    if (tab === "pendentes") return p.status === "inativo";
    if (tab === "ativos") return p.status === "ativo";
    if (tab === "admins") return (roles[p.id] ?? []).includes("admin");
    return true;
  });

  const liberar = async (p: Profile) => {
    setBusy(p.id);
    const { error } = await supabase.from("profiles").update({ status: "ativo" }).eq("id", p.id);
    setBusy(null);
    if (error) return toast.error("Erro ao liberar.");
    toast.success(`${p.nome || p.email} liberado para acessar o sistema.`);
    load();
  };

  const inativar = async (p: Profile) => {
    if (p.id === user?.id) return toast.error("Você não pode inativar a si mesmo.");
    setBusy(p.id);
    const { error } = await supabase.from("profiles").update({ status: "inativo" }).eq("id", p.id);
    setBusy(null);
    if (error) return toast.error("Erro ao inativar.");
    toast.success("Usuário inativado.");
    load();
  };

  const promote = async (p: Profile) => {
    setBusy(p.id);
    const { error } = await supabase.from("user_roles").insert({ user_id: p.id, role: "admin" });
    setBusy(null);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) return toast.info("Este usuário já é administrador.");
      return toast.error("Erro ao promover.");
    }
    toast.success("Usuário promovido a administrador.");
    load();
  };

  const demote = async (p: Profile) => {
    if (p.id === user?.id) return toast.error("Você não pode remover seu próprio acesso de administrador.");
    setBusy(p.id);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", p.id).eq("role", "admin");
    setBusy(null);
    if (error) return toast.error("Erro ao remover.");
    toast.success("Acesso de administrador removido.");
    load();
  };

  const excluir = async (p: Profile) => {
    if (p.id === user?.id) return toast.error("Você não pode excluir a si mesmo.");
    setBusy(p.id);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { userId: p.id },
    });
    setBusy(null);
    setConfirmDelete(null);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || "Erro ao excluir.";
      return toast.error(msg);
    }
    toast.success("Usuário excluído com sucesso.");
    load();
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pendentes", label: "Pendentes", count: counts.pendentes },
    { id: "ativos", label: "Ativos", count: counts.ativos },
    { id: "admins", label: "Administradores", count: counts.admins },
    { id: "todos", label: "Todos", count: counts.todos },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Libere o acesso de novos motoristas, promova outros administradores ou remova usuários.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {t.label} <span className="ml-1 opacity-80">({t.count})</span>
            </button>
          ))}
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
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {filtered.map((p) => {
              const userRoles = roles[p.id] ?? [];
              const isAdmin = userRoles.includes("admin");
              const isMe = p.id === user?.id;
              const isPending = p.status === "inativo";
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {p.nome || "—"} {isMe && <span className="text-xs text-muted-foreground">(você)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      isPending ? "bg-warning/15 text-warning-foreground" : "bg-success/15 text-success"
                    }`}>{isPending ? "Pendente" : "Ativo"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {userRoles.map((r) => (
                      <span key={r} className={`rounded-full px-2 py-0.5 text-xs font-medium ${r === "admin" ? "bg-primary/15 text-primary" : "bg-accent text-accent-foreground"}`}>{r}</span>
                    ))}
                  </div>
                  <ActionButtons
                    p={p}
                    isAdmin={isAdmin}
                    isMe={isMe}
                    isPending={isPending}
                    busy={busy === p.id}
                    onLiberar={() => liberar(p)}
                    onInativar={() => inativar(p)}
                    onPromote={() => promote(p)}
                    onDemote={() => demote(p)}
                    onDelete={() => setConfirmDelete(p)}
                  />
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
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
                  const isPending = p.status === "inativo";
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">
                        {p.nome || "—"} {isMe && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}
                      </td>
                      <td className="px-4 py-2">{p.email}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {userRoles.length === 0 ? <span className="text-xs text-muted-foreground">—</span> :
                            userRoles.map((r) => (
                              <span key={r} className={`rounded-full px-2 py-0.5 text-xs font-medium ${r === "admin" ? "bg-primary/15 text-primary" : "bg-accent text-accent-foreground"}`}>{r}</span>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${isPending ? "bg-warning/15 text-warning-foreground" : "bg-success/15 text-success"}`}>
                          {isPending ? "Pendente" : "Ativo"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <ActionButtons
                          p={p}
                          isAdmin={isAdmin}
                          isMe={isMe}
                          isPending={isPending}
                          busy={busy === p.id}
                          onLiberar={() => liberar(p)}
                          onInativar={() => inativar(p)}
                          onPromote={() => promote(p)}
                          onDemote={() => demote(p)}
                          onDelete={() => setConfirmDelete(p)}
                          align="end"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente a conta de <b>{confirmDelete?.nome || confirmDelete?.email}</b>,
              todos os registros, vínculos e o acesso ao sistema. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && excluir(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ActionButtons = ({
  p, isAdmin, isMe, isPending, busy, onLiberar, onInativar, onPromote, onDemote, onDelete, align,
}: {
  p: Profile; isAdmin: boolean; isMe: boolean; isPending: boolean; busy: boolean;
  onLiberar: () => void; onInativar: () => void; onPromote: () => void; onDemote: () => void; onDelete: () => void;
  align?: "end";
}) => (
  <div className={`mt-2 flex flex-wrap gap-1 ${align === "end" ? "justify-end" : ""}`}>
    {isPending ? (
      <Button size="sm" disabled={busy} onClick={onLiberar}>
        <CheckCircle2 className="mr-1 h-4 w-4" /> Liberar
      </Button>
    ) : (
      <Button size="sm" variant="outline" disabled={busy || isMe} onClick={onInativar} title={isMe ? "Você não pode inativar a si mesmo" : ""}>
        <Ban className="mr-1 h-4 w-4" /> Inativar
      </Button>
    )}
    {isAdmin ? (
      <Button size="sm" variant="outline" disabled={busy || isMe} onClick={onDemote} title={isMe ? "Você não pode remover seu próprio acesso" : ""}>
        <ShieldOff className="mr-1 h-4 w-4" /> Remover admin
      </Button>
    ) : (
      <Button size="sm" variant="outline" disabled={busy} onClick={onPromote}>
        <ShieldCheck className="mr-1 h-4 w-4" /> Promover
      </Button>
    )}
    <Button size="sm" variant="ghost" disabled={busy || isMe} onClick={onDelete} title={isMe ? "Você não pode excluir a si mesmo" : ""} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
      <Trash2 className="mr-1 h-4 w-4" /> Excluir
    </Button>
  </div>
);

export default AdminUsuarios;
