import { useState, FormEvent, useEffect } from "react";
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

  useEffect(() => {
    document.title = "Entrar | Registro de Motoristas";
  }, []);

  // Redirect controlado por effect (não declarativo, evita loop de replaceState)
  useEffect(() => {
    if (!ready || !session) return;
    const fromPath = (location.state as any)?.from?.pathname as string | undefined;
    const target = fromPath && fromPath !== "/login" ? fromPath : isAdmin ? "/admin" : "/app";
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [ready, session, isAdmin, navigate, location.pathname, location.state]);

  // Enquanto auth carrega ou se já estiver logado e prestes a redirecionar, mostra loading
  if (!ready) return <LoadingScreen />;
  if (session) return <LoadingScreen />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha inválidos." : error.message);
      return;
    }
    toast.success("Bem-vindo!");
    // Não navega aqui: o effect acima redireciona quando session/ready estabilizarem
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
          <div className="flex items-center justify-between text-sm">
            <Link to="/cadastro" className="text-primary hover:text-primary-hover">Criar conta</Link>
            <Link to="/recuperar-senha" className="text-primary hover:text-primary-hover">Esqueci minha senha</Link>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Motoristas podem se cadastrar. O acesso de administrador é controlado pelo sistema.
        </p>
      </div>
    </div>
  );
};

export default Login;
