import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
  const { session, loading, isAdmin, isMotorista } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;

  if (requireAdmin && !isAdmin) {
    // motorista tentando acessar admin
    return <Navigate to="/app" replace />;
  }

  if (!requireAdmin && !isAdmin && !isMotorista) {
    // sem nenhum papel atribuído
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
