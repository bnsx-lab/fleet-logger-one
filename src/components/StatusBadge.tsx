import { cn } from "@/lib/utils";
import { Clock, Eye, CheckCircle2, Edit3, XCircle } from "lucide-react";

export type RegistroStatus = "pendente" | "revisado" | "aprovado" | "corrigido" | "cancelado";

const config: Record<RegistroStatus, { label: string; style: string; Icon: typeof Clock }> = {
  pendente: {
    label: "Pendente",
    style: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Clock,
  },
  revisado: {
    label: "Em revisao",
    style: "bg-orange-50 text-orange-700 border-orange-200",
    Icon: Eye,
  },
  aprovado: {
    label: "Aprovado",
    style: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  corrigido: {
    label: "Corrigido",
    style: "bg-slate-50 text-slate-600 border-slate-200",
    Icon: Edit3,
  },
  cancelado: {
    label: "Cancelado",
    style: "bg-red-50 text-red-600 border-red-200",
    Icon: XCircle,
  },
};

type Props = {
  status: RegistroStatus;
  showIcon?: boolean;
  size?: "sm" | "md";
};

export const StatusBadge = ({ status, showIcon = false, size = "sm" }: Props) => {
  const { label, style, Icon } = config[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        style,
      )}
    >
      {showIcon && <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {label}
    </span>
  );
};
