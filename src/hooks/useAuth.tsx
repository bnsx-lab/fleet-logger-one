import { createContext, useContext, useEffect, useRef, useState, ReactNode, useMemo } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "motorista";

type AuthState = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  isAdmin: boolean;
  isMotorista: boolean;
  /** true somente quando a sessão E os papéis terminaram de carregar */
  ready: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [authResolved, setAuthResolved] = useState(false);
  const [rolesReady, setRolesReady] = useState(false);

  // Controle explícito para evitar race entre getSession e INITIAL_SESSION/TOKEN_REFRESHED
  const loadedRolesForUserRef = useRef<string | null>(null);
  const loadingRolesForUserRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const resetRoleState = () => {
      loadedRolesForUserRef.current = null;
      loadingRolesForUserRef.current = null;
      setRoles([]);
      setRolesReady(true);
    };

    const loadRoles = async (userId: string) => {
      if (
        loadedRolesForUserRef.current === userId ||
        loadingRolesForUserRef.current === userId
      ) {
        return;
      }

      loadingRolesForUserRef.current = userId;
      setRolesReady(false);

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!mounted) return;

      loadingRolesForUserRef.current = null;
      loadedRolesForUserRef.current = userId;

      if (!error && data) {
        setRoles(data.map((r) => r.role as AppRole));
      } else {
        setRoles([]);
      }

      setRolesReady(true);
    };

    const handleSession = (sess: Session | null) => {
      if (!mounted) return;

      setSession(sess);
      setAuthResolved(true);

      const userId = sess?.user?.id ?? null;
      if (!userId) {
        resetRoleState();
        return;
      }

      if (loadedRolesForUserRef.current === userId) {
        setRolesReady(true);
        return;
      }

      if (loadingRolesForUserRef.current === userId) {
        setRolesReady(false);
        return;
      }

      setTimeout(() => {
        if (mounted) loadRoles(userId);
      }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      handleSession(sess);
    });

    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    loadedRolesForUserRef.current = null;
    loadingRolesForUserRef.current = null;
    setRoles([]);
    setRolesReady(false);
  };

  const value = useMemo<AuthState>(() => {
    const isAdmin = roles.includes("admin");
    const isMotorista = roles.includes("motorista");
    const ready = authResolved && (!session || rolesReady);

    return {
      session,
      user: session?.user ?? null,
      roles,
      isAdmin,
      isMotorista,
      ready,
      signOut,
    };
  }, [session, roles, authResolved, rolesReady]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
};
