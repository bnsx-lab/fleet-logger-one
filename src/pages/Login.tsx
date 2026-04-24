import { useState, FormEvent, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Logo } from "@/components/Logo";
import { ArrowRight } from "lucide-react";

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
    document.title = "Entrar | Controle de BDT";
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Header com branding forte */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border">
            <Logo className="h-14 w-14" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Controle de BDT
          </h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Sistema ASERP
          </p>
        </div>

        {/* Formulario de login */}
        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full gap-2 text-base font-semibold"
            disabled={submitting}
          >
            {submitting ? "Entrando..." : "Entrar"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </Button>
          
          <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
            <Link
              to="/cadastro"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Criar conta
            </Link>
            <Link
              to="/recuperar-senha"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>

        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
          Motoristas podem criar sua conta aqui.<br />
          O acesso administrativo e controlado separadamente.
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
