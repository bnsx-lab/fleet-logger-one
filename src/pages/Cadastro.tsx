import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Logo } from "@/components/Logo";
import { CheckCircle2 } from "lucide-react";

const Cadastro = () => {
  const { ready, session, isAdmin, isApproved } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { document.title = "Criar conta | Controle de BDT"; }, []);

  // Se a sessão chega e o usuário JÁ está aprovado (ex.: admin), manda para área
  useEffect(() => {
    if (!ready || !session || success) return;
    if (isApproved) {
      navigate(isAdmin ? "/admin" : "/app", { replace: true });
    }
  }, [ready, session, isAdmin, isApproved, success, navigate]);

  if (!ready) return <LoadingScreen />;

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

    setSuccess(true);
    // Sai imediatamente para impedir que ele entre como pendente sem ver a mensagem
    await supabase.auth.signOut();
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <Logo className="mx-auto mb-3 h-14 w-14" />
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Cadastro recebido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu cadastro foi recebido e está aguardando liberação do administrador.
            Você receberá acesso assim que for aprovado.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild><Link to="/login">Voltar para o login</Link></Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Controle de BDT — Boletim Diário de Transporte · ASERP
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3 h-16 w-16" />
          <h1 className="text-2xl font-bold">Criar conta</h1>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">ASERP</p>
          <p className="mt-1 text-sm text-muted-foreground">Controle de BDT — Boletim Diário de Transporte</p>
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
          Após o cadastro, o administrador precisa liberar seu acesso para você usar o sistema.
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
