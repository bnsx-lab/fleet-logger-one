import { cn } from "@/lib/utils";

export type RegistroStatus = "pendente" | "revisado" | "aprovado" | "corrigido" | "cancelado";

const styles: Record<RegistroStatus, string> = {
  pendente: "bg-warning/15 text-warning-foreground border-warning/40",
  revisado: "bg-accent text-accent-foreground border-primary/30",
  aprovado: "bg-success/15 text-success border-success/30",
  corrigido: "bg-muted text-foreground border-border",
  cancelado: "bg-destructive/10 text-destructive border-destructive/30",
};

const labels: Record<RegistroStatus, string> = {
  pendente: "Pendente",
  revisado: "Revisado",
  aprovado: "Aprovado",
  corrigido: "Corrigido",
  cancelado: "Cancelado",
};

export const StatusBadge = ({ status }: { status: RegistroStatus }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
      styles[status],
    )}
  >
    {labels[status]}
  </span>
);
