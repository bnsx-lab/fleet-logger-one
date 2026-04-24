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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header institucional */}
      <header className="flex items-center justify-center border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-sm font-semibold text-foreground">ASERP</span>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {/* Branding do sistema */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Controle de BDT</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sistema de registro de deslocamentos
            </p>
          </div>

          {/* Formulário de login */}
          <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
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
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
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
            <Button type="submit" className="h-11 w-full text-base font-medium" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
            <div className="flex items-center justify-between pt-1 text-sm">
              <Link to="/cadastro" className="font-medium text-primary hover:text-primary-hover transition-colors">
                Criar conta
              </Link>
              <Link to="/recuperar-senha" className="text-muted-foreground hover:text-foreground transition-colors">
                Esqueci minha senha
              </Link>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Motoristas podem criar conta livremente.<br />
            Acesso administrativo requer autorização.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
        ASERP &middot; Controle de BDT
      </footer>
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
