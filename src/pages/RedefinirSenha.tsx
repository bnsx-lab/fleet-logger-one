import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Redefinir senha"; }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const weakPasswordMessage = validateStrongPassword(password);
    if (weakPasswordMessage) return toast.error(weakPasswordMessage);
    if (password !== confirm) return toast.error("As senhas não coincidem.");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) return toast.error(mapPasswordError(error.message));
    toast.success("Senha atualizada.");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold">Definir nova senha</h1>
        <p className="text-sm text-muted-foreground">
          Use pelo menos 8 caracteres com letras maiúsculas, minúsculas, números e símbolo.
        </p>
        <div className="space-y-2">
          <Label htmlFor="p1">Nova senha</Label>
          <Input id="p1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p2">Confirmar senha</Label>
          <Input id="p2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </div>
  );
};

const validateStrongPassword = (password: string) => {
  if (password.length < 8) return "Senha fraca. Use pelo menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "Senha fraca. Inclua pelo menos uma letra maiúscula.";
  if (!/[a-z]/.test(password)) return "Senha fraca. Inclua pelo menos uma letra minúscula.";
  if (!/[0-9]/.test(password)) return "Senha fraca. Inclua pelo menos um número.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Senha fraca. Inclua pelo menos um símbolo.";
  return null;
};

const mapPasswordError = (message: string) => {
  if (/Password/i.test(message) && /weak|short|length|characters/i.test(message)) {
    return "Senha fraca. Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas, números e símbolo.";
  }
  return "Não foi possível atualizar a senha. Tente novamente.";
};

export default RedefinirSenha;
