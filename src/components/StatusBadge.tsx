import { cn } from "@/lib/utils";
import type { RegistroStatus } from "@/lib/registros";

export type { RegistroStatus };

const adminLabels: Record<RegistroStatus, string> = {
  rascunho: "Rascunho",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  pendente: "Pendente",
  revisado: "Revisado",
  aprovado: "Aprovado",
  corrigido: "Corrigido",
  cancelado: "Cancelado",
};

const motoristaLabels: Record<RegistroStatus, string> = {
  rascunho: "Rascunho",
  em_andamento: "Em andamento",
  finalizado: "Registro feito",
  pendente: "Registro feito",
  revisado: "Registro feito",
  aprovado: "Aprovado",
  corrigido: "Corrigido pelo admin",
  cancelado: "Cancelado",
};

const styles: Record<RegistroStatus, string> = {
  rascunho: "bg-muted text-foreground border-border",
  em_andamento: "bg-warning/15 text-warning-foreground border-warning/40",
  finalizado: "bg-success/15 text-success border-success/30",
  pendente: "bg-warning/15 text-warning-foreground border-warning/40",
  revisado: "bg-accent text-accent-foreground border-primary/30",
  aprovado: "bg-success/15 text-success border-success/30",
  corrigido: "bg-muted text-foreground border-border",
  cancelado: "bg-destructive/10 text-destructive border-destructive/30",
};

const motoristaStyles: Record<RegistroStatus, string> = {
  ...styles,
  pendente: "bg-success/15 text-success border-success/30",
  revisado: "bg-success/15 text-success border-success/30",
};

type Props = { status: RegistroStatus; viewer?: "admin" | "motorista" };

export const StatusBadge = ({ status, viewer = "admin" }: Props) => {
  const label = viewer === "motorista" ? motoristaLabels[status] : adminLabels[status];
  const cls = viewer === "motorista" ? motoristaStyles[status] : styles[status];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}>
      {label}
    </span>
  );
};
