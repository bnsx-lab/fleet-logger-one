import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
  const { session, ready, isAdmin, isMotorista } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!ready) return;

    const here = location.pathname;

    if (!session) {
      if (here !== "/login") {
        navigate("/login", { replace: true, state: { fromPath: here } });
      }
      return;
    }

    if (!isAdmin && !isMotorista) {
      if (here !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    if (requireAdmin && !isAdmin) {
      if (!here.startsWith("/app")) {
        navigate("/app", { replace: true });
      }
    }
  }, [ready, session, isAdmin, isMotorista, requireAdmin, location.pathname, navigate]);

  if (!ready) return <LoadingScreen />;
  if (!session) return <LoadingScreen />;
  if (!isAdmin && !isMotorista) return <LoadingScreen />;
  if (requireAdmin && !isAdmin) return <LoadingScreen />;

  return <>{children}</>;
};
