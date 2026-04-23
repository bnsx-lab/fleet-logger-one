import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Rota raiz "/". Apenas decide para onde mandar o usuário UMA vez,
 * via useEffect, depois que a auth estiver pronta.
 */
const Index = () => {
  const { ready, session, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      navigate("/login", { replace: true });
    } else {
      navigate(isAdmin ? "/admin" : "/app", { replace: true });
    }
  }, [ready, session, isAdmin, navigate]);

  return <LoadingScreen />;
};

export default Index;
