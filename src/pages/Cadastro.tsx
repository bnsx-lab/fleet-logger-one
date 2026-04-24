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
    document.title = "Criar conta | Registro de Motoristas";
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3 h-16 w-16" />
          <h1 className="text-2xl font-bold">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cadastro de motorista ASERP</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Criando..." : "Criar conta"}
          </Button>
          <div className="text-center text-sm">
            <Link to="/login" className="text-primary hover:text-primary-hover">Já tenho conta</Link>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sua conta começa como motorista. Após o cadastro, o administrador poderá vincular sua empresa, posto e veículo.
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
