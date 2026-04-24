import { cn } from "@/lib/utils";

export type RegistroStatus = "pendente" | "revisado" | "aprovado" | "corrigido" | "cancelado";

const styles: Record<RegistroStatus, string> = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  revisado: "bg-blue-50 text-blue-700 border-blue-200",
  aprovado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  corrigido: "bg-slate-50 text-slate-600 border-slate-200",
  cancelado: "bg-red-50 text-red-600 border-red-200",
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
      "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
      styles[status],
    )}
  >
    {labels[status]}
  </span>
);
