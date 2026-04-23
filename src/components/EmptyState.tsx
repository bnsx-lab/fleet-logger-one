import { ReactNode } from "react";
import { Inbox } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export const EmptyState = ({ title, description, icon, action }: Props) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      {icon ?? <Inbox className="h-6 w-6" />}
    </div>
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
