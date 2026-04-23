import { useState, FormEvent, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

const Login = () => {
  const { ready, session, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fromPath = useMemo(() => {
    const value = (location.state as { fromPath?: string } | null)?.fromPath;
    return typeof value === "string" ? value : undefined;
  }, [location.state]);

  useEffect(() => {
    document.title = "Entrar | Registro de Motoristas";
  }, []);

  useEffect(() => {
    if (!ready || !session) return;

    const target = fromPath && fromPath !== "/login"
      ? fromPath
      : isAdmin
        ? "/admin"
        : "/app";

    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [ready, session, isAdmin, fromPath, location.pathname, navigate]);

  if (!ready) return <LoadingScreen />;
  if (session) return <LoadingScreen />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (error) {
      const message = mapAuthError(error.message);
      toast.error(message);
      return;
    }

    toast.success("Bem-vindo!");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Truck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Registro de Motoristas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre com seu e-mail e senha</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
          <div className="text-center text-sm">
            <Link to="/recuperar-senha" className="text-primary hover:text-primary-hover">Esqueci minha senha</Link>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          O acesso é criado pelo administrador. Se você ainda não recebeu suas credenciais, fale com a administração.
        </p>
      </div>
    </div>
  );
};

const mapAuthError = (message: string) => {
  if (message === "Invalid login credentials") return "E-mail ou senha inválidos.";
  if (/Password/i.test(message) && /weak|short|length|characters/i.test(message)) {
    return "Senha fraca. Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas, números e símbolo.";
  }
  return "Não foi possível entrar. Verifique seus dados e tente novamente.";
};

export default Login;
