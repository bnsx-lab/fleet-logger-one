import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

const Index = () => {
  const { session, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? "/admin" : "/app"} replace />;
};

export default Index;
