import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

/**
 * Guard único de proteção. Toda decisão de redirect acontece DENTRO de um useEffect,
 * comparando o pathname atual com o destino para nunca chamar navigate em loop.
 */
export const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
  const { session, ready, isAdmin, isMotorista } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!ready) return;

    const here = location.pathname;

    // 1) Não autenticado
    if (!session) {
      if (here !== "/login") {
        navigate("/login", { replace: true, state: { from: location } });
      }
      return;
    }

    // 2) Autenticado mas sem nenhum papel atribuído
    if (!isAdmin && !isMotorista) {
      if (here !== "/login") navigate("/login", { replace: true });
      return;
    }

    // 3) Motorista tentando entrar em rota admin
    if (requireAdmin && !isAdmin) {
      if (!here.startsWith("/app")) navigate("/app", { replace: true });
      return;
    }
  }, [ready, session, isAdmin, isMotorista, requireAdmin, location.pathname, navigate]);

  if (!ready) return <LoadingScreen />;
  if (!session) return <LoadingScreen />;
  if (requireAdmin && !isAdmin) return <LoadingScreen />;
  if (!isAdmin && !isMotorista) return <LoadingScreen />;

  return <>{children}</>;
};
