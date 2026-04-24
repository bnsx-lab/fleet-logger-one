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
import { UserPlus } from "lucide-react";

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
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border">
            <Logo className="h-14 w-14" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Criar conta
          </h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Cadastro de motorista
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="nome" className="text-sm font-medium text-foreground">
              Nome completo
            </Label>
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-sm font-medium text-foreground">
              Confirmar senha
            </Label>
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
          <Button
            type="submit"
            className="h-11 w-full gap-2 text-base font-semibold"
            disabled={submitting}
          >
            {submitting ? "Criando..." : "Criar conta"}
            {!submitting && <UserPlus className="h-4 w-4" />}
          </Button>
          
          <div className="border-t border-border pt-4 text-center text-sm">
            <Link
              to="/login"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Ja tenho uma conta
            </Link>
          </div>
        </form>

        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
          Sua conta comeca como motorista. Apos o cadastro, o administrador vinculara sua empresa e posto.
        </p>
      </div>
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
