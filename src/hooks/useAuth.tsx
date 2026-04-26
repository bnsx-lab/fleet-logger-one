import { createContext, useContext, useEffect, useRef, useState, ReactNode, useMemo } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "motorista";
export type ProfileStatus = "ativo" | "inativo";

type AuthState = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  isAdmin: boolean;
  isMotorista: boolean;
  profileStatus: ProfileStatus | null;
  /** true quando o admin liberou o acesso (status === 'ativo') ou quando é admin */
  isApproved: boolean;
  /** true somente quando a sessão E os papéis E o profile terminaram de carregar */
  ready: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  const loadedForUserRef = useRef<string | null>(null);
  const loadingForUserRef = useRef<string | null>(null);

  const loadAll = async (userId: string) => {
    if (loadedForUserRef.current === userId || loadingForUserRef.current === userId) return;
    loadingForUserRef.current = userId;
    setProfileReady(false);

    const [r, p] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("status").eq("id", userId).maybeSingle(),
    ]);

    loadingForUserRef.current = null;
    loadedForUserRef.current = userId;

    setRoles(((r.data as any) ?? []).map((x: any) => x.role as AppRole));
    setProfileStatus(((p.data as any)?.status as ProfileStatus) ?? "inativo");
    setProfileReady(true);
  };

  useEffect(() => {
    let mounted = true;

    const reset = () => {
      loadedForUserRef.current = null;
      loadingForUserRef.current = null;
      setRoles([]);
      setProfileStatus(null);
      setProfileReady(true);
    };

    const handle = (sess: Session | null) => {
      if (!mounted) return;
      setSession(sess);
      setAuthResolved(true);
      const uid = sess?.user?.id ?? null;
      if (!uid) return reset();
      if (loadedForUserRef.current === uid) { setProfileReady(true); return; }
      setTimeout(() => { if (mounted) loadAll(uid); }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => handle(sess));
    supabase.auth.getSession().then(({ data }) => handle(data.session));

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const refreshProfile = async () => {
    if (!session?.user?.id) return;
    loadedForUserRef.current = null;
    await loadAll(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    loadedForUserRef.current = null;
    loadingForUserRef.current = null;
    setRoles([]);
    setProfileStatus(null);
  };

  const value = useMemo<AuthState>(() => {
    const isAdmin = roles.includes("admin");
    const isMotorista = roles.includes("motorista");
    const ready = authResolved && (!session || profileReady);
    const isApproved = isAdmin || profileStatus === "ativo";
    return {
      session, user: session?.user ?? null, roles,
      isAdmin, isMotorista, profileStatus, isApproved,
      ready, refreshProfile, signOut,
    };
  }, [session, roles, profileStatus, authResolved, profileReady]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
};
