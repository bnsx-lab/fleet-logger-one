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
  /** true até a sessão E os papéis terminarem de carregar */
  ready: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [ready, setReady] = useState(false);

  // Guarda qual userId teve seus papéis carregados, para não recarregar em cada token refresh
  const loadedRolesForUserRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadRoles = async (userId: string) => {
      if (loadedRolesForUserRef.current === userId) return;
      loadedRolesForUserRef.current = userId;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (!mounted) return;
      if (!error && data) {
        setRoles(data.map((r) => r.role as AppRole));
      } else {
        setRoles([]);
      }
      setReady(true);
    };

    // 1) Listener primeiro
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      const userId = sess?.user?.id ?? null;
      if (!userId) {
        loadedRolesForUserRef.current = null;
        setRoles([]);
        setReady(true);
        return;
      }
      // Carrega papéis apenas se mudou de usuário (evita disparos em token refresh)
      if (loadedRolesForUserRef.current !== userId) {
        // Defer para fora do callback para evitar deadlock
        setTimeout(() => {
          if (mounted) loadRoles(userId);
        }, 0);
      } else {
        setReady(true);
      }
    });

    // 2) Sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const sess = data.session;
      setSession(sess);
      const userId = sess?.user?.id ?? null;
      if (!userId) {
        setReady(true);
        return;
      }
      loadRoles(userId);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    loadedRolesForUserRef.current = null;
    setRoles([]);
  };

  // Memoiza para manter referência estável quando nada relevante mudou
  const value = useMemo<AuthState>(() => {
    const isAdmin = roles.includes("admin");
    const isMotorista = roles.includes("motorista");
    return {
      session,
      user: session?.user ?? null,
      roles,
      isAdmin,
      isMotorista,
      ready,
      signOut,
    };
  }, [session, roles, ready]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
};
