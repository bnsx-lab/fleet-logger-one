import { useState, FormEvent, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Logo } from "@/components/Logo";

const Cadastro = () => {
  const { ready, session, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Criar conta | Controle de BDT";
  }, []);

  useEffect(() => {
    if (!ready || !session) return;
    const target = isAdmin ? "/admin" : "/app";
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [ready, session, isAdmin, location.pathname, navigate]);

  if (!ready) return <LoadingScreen />;
  if (session) return <LoadingScreen />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (nome.trim().length < 2) return toast.error("Informe seu nome.");
    if (password.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não coincidem.");

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome: nome.trim() },
      },
    });
    setSubmitting(false);

    if (error) {
      toast.error(mapSignupError(error.message));
      return;
    }

    toast.success("Conta criada!");
    // Redirect tratado pelo useEffect quando a sessão chegar
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
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Branding */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Criar conta</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Cadastro de motorista no Controle de BDT
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-sm font-medium">Nome completo</Label>
              <Input 
                id="nome" 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                required 
                maxLength={120}
                placeholder="Seu nome"
                className="h-11"
              />
            </div>
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
                autoComplete="new-password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium">Confirmar senha</Label>
              <Input 
                id="confirm" 
                type="password" 
                autoComplete="new-password" 
                required 
                value={confirm} 
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                className="h-11"
              />
            </div>
            <Button type="submit" className="h-11 w-full text-base font-medium" disabled={submitting}>
              {submitting ? "Criando..." : "Criar conta"}
            </Button>
            <div className="text-center text-sm">
              <Link to="/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
                Já tenho conta
              </Link>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
            Sua conta começa como motorista. O administrador poderá vincular sua empresa e posto.
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

const mapSignupError = (message: string) => {
  if (/already registered|already exists|User already/i.test(message)) {
    return "Este e-mail já possui cadastro. Tente entrar ou recuperar a senha.";
  }
  if (/invalid email/i.test(message)) {
    return "E-mail inválido.";
  }
  if (/password/i.test(message) && /short|length|characters|6/i.test(message)) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  return "Não foi possível criar a conta. Tente novamente.";
};

export default Cadastro;
